# backend/app/services/preflight/checker.py
"""
Preflight Compliance Checking Engine.

Evaluates a manuscript's canonical ManuscriptIR against target JournalTemplate
rules, producing itemized compliance diagnostics and aggregate pass/fail statuses.
"""

from __future__ import annotations

import re
import logging
from typing import Optional, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.journal_template import JournalTemplate, TemplateRule
from app.models.preflight import PreflightResult, PreflightCheckItem
from app.models.manuscript import Manuscript
from app.schemas.manuscript_ir import ManuscriptIR, SectionNode
from app.crud.extracted_metadata import get_extracted_metadata, metadata_to_ir

logger = logging.getLogger(__name__)


class PreflightChecker:
    """
    Evaluates manuscript metadata against target journal submission constraints.
    """

    @staticmethod
    def _count_words(text: Optional[str]) -> int:
        if not text or not isinstance(text, str):
            return 0
        return len(text.strip().split())

    @staticmethod
    def _count_section_words(sections: list[SectionNode | dict]) -> int:
        total = 0
        for s in sections:
            if isinstance(s, SectionNode):
                for p in s.content:
                    total += len(p.strip().split())
                if s.children:
                    total += PreflightChecker._count_section_words(s.children)
            elif isinstance(s, dict):
                content = s.get("content", [])
                for p in content:
                    if isinstance(p, str):
                        total += len(p.strip().split())
                children = s.get("children", [])
                if children:
                    total += PreflightChecker._count_section_words(children)
        return total

    @classmethod
    def evaluate_rule(
        cls,
        rule: TemplateRule,
        ir: ManuscriptIR,
        template: JournalTemplate,
    ) -> tuple[str, str, dict[str, Any], dict[str, Any]]:
        """
        Evaluates a single TemplateRule against ManuscriptIR.

        Returns:
            (status, message, actual_value, expected_value)
            where status is 'PASS', 'WARN', or 'FAIL'.
        """
        rule_type = rule.rule_type
        config = rule.rule_config or {}
        severity = rule.severity if rule.severity in ("FAIL", "WARN") else "FAIL"

        # ── 1. Word Count Rules ───────────────────────────────────────────────
        if rule_type == "word_count":
            target_field = config.get("field", "abstract")
            max_limit = config.get("max")
            min_limit = config.get("min")

            if target_field == "abstract":
                actual_count = cls._count_words(ir.abstract)
                field_label = "Abstract"
            elif target_field in ("sections", "main_text", "body"):
                actual_count = cls._count_section_words(ir.sections)
                field_label = "Main text"
            elif target_field in ("total", "full"):
                actual_count = cls._count_words(ir.abstract) + cls._count_section_words(ir.sections)
                field_label = "Total manuscript"
            elif target_field == "title":
                actual_count = cls._count_words(ir.title)
                field_label = "Title"
            else:
                actual_count = cls._count_words(getattr(ir, target_field, ""))
                field_label = target_field.capitalize()

            actual_val = {"word_count": actual_count, "field": target_field}
            expected_val = {"max": max_limit, "min": min_limit}

            # Check max threshold
            if max_limit is not None and actual_count > max_limit:
                msg = f"{field_label} ({actual_count:,} words) exceeds {template.name}'s limit of {max_limit:,} words."
                return severity, msg, actual_val, expected_val

            # Check approaching max threshold (within 5% buffer)
            if max_limit is not None and severity == "FAIL" and actual_count > (max_limit * 0.95):
                msg = f"{field_label} is at {actual_count:,} words, approaching {template.name}'s {max_limit:,}-word maximum."
                return "WARN", msg, actual_val, expected_val

            # Check min threshold
            if min_limit is not None and actual_count < min_limit:
                msg = f"{field_label} ({actual_count:,} words) is below the minimum required {min_limit:,} words."
                return severity, msg, actual_val, expected_val

            return "PASS", f"{field_label} word count ({actual_count:,} words) conforms to guidelines (limit: {max_limit or 'none'}).", actual_val, expected_val

        # ── 2. Required Field Rules ───────────────────────────────────────────
        elif rule_type == "required_field":
            field_path = config.get("field_path", config.get("field", ""))
            raw_val = getattr(ir, field_path, None)

            is_present = False
            if raw_val is not None:
                if isinstance(raw_val, str) and raw_val.strip():
                    is_present = True
                elif isinstance(raw_val, list) and len(raw_val) > 0:
                    is_present = True
                elif isinstance(raw_val, dict) and bool(raw_val):
                    is_present = True

            actual_val = {"is_present": is_present, "field": field_path}
            expected_val = {"required": True, "field": field_path}

            friendly_name = field_path.replace("_", " ").title()
            if not is_present:
                msg = rule.message or f"{template.name} requires a mandatory {friendly_name} statement, which is currently missing."
                return severity, msg, actual_val, expected_val

            return "PASS", f"{friendly_name} statement is present and documented.", actual_val, expected_val

        # ── 3. Regex Pattern Rules ───────────────────────────────────────────
        elif rule_type == "regex":
            target_field = config.get("field", "abstract")
            pattern = config.get("pattern", "")
            should_not_match = config.get("should_not_match", False)

            text_to_check = getattr(ir, target_field, "") or ""
            if not isinstance(text_to_check, str):
                text_to_check = str(text_to_check)

            match_found = bool(re.search(pattern, text_to_check, re.IGNORECASE)) if pattern else False

            actual_val = {"matches_pattern": match_found, "field": target_field}
            expected_val = {"pattern": pattern, "should_not_match": should_not_match}

            if should_not_match and match_found:
                msg = rule.message or f"{target_field.capitalize()} contains disallowed patterns matching '{pattern}'."
                return severity, msg, actual_val, expected_val
            elif not should_not_match and not match_found:
                msg = rule.message or f"{target_field.capitalize()} does not match required format pattern '{pattern}'."
                return severity, msg, actual_val, expected_val

            return "PASS", f"{target_field.capitalize()} satisfies formatting pattern requirements.", actual_val, expected_val

        # ── 4. Presence / Array Count Rules ───────────────────────────────────
        elif rule_type == "presence":
            target_field = config.get("field", "references")
            max_count = config.get("max_count")
            min_count = config.get("min_count")

            items = getattr(ir, target_field, []) or []
            item_count = len(items) if isinstance(items, list) else (1 if items else 0)

            actual_val = {"count": item_count, "field": target_field}
            expected_val = {"max_count": max_count, "min_count": min_count}

            friendly_name = target_field.replace("_", " ").title()

            if max_count is not None and item_count > max_count:
                msg = f"{friendly_name} count ({item_count}) exceeds {template.name}'s guideline of {max_count} items."
                return severity, msg, actual_val, expected_val

            if min_count is not None and item_count < min_count:
                msg = f"{friendly_name} count ({item_count}) is below the required minimum of {min_count} items."
                return severity, msg, actual_val, expected_val

            if min_count is None and max_count is None and item_count == 0:
                msg = f"{friendly_name} has no entries listed."
                return severity, msg, actual_val, expected_val

            return "PASS", f"{friendly_name} count ({item_count}) conforms to guidelines.", actual_val, expected_val

        # ── 5. Default Fallback ───────────────────────────────────────────────
        return "PASS", "Check passed.", {}, {}

    @classmethod
    async def run_preflight(
        cls,
        session: AsyncSession,
        manuscript: Manuscript,
        template: JournalTemplate,
        rules: list[TemplateRule],
    ) -> PreflightResult:
        """
        Executes preflight check against the manuscript and persists PreflightResult.
        """
        # Load ManuscriptIR from extracted metadata
        metadata_row = await get_extracted_metadata(session, manuscript.id)
        ir = metadata_to_ir(metadata_row, word_count=manuscript.word_count)

        # Create new PreflightResult
        result = PreflightResult(
            manuscript_id=manuscript.id,
            template_id=template.id,
            overall_status="PASS",
            human_confirmed=False,
            summary_counts={"PASS": 0, "WARN": 0, "FAIL": 0},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(result)
        await session.flush()

        check_items: list[PreflightCheckItem] = []
        counts = {"PASS": 0, "WARN": 0, "FAIL": 0}

        sorted_rules = sorted(rules, key=lambda r: r.sort_order)

        for idx, rule in enumerate(sorted_rules, start=1):
            status_val, msg, actual_val, expected_val = cls.evaluate_rule(rule, ir, template)
            counts[status_val] = counts.get(status_val, 0) + 1

            item = PreflightCheckItem(
                result_id=result.id,
                rule_id=rule.id,
                rule_key=rule.rule_key,
                rule_type=rule.rule_type,
                status=status_val,
                message=msg,
                actual_value=actual_val,
                expected_value=expected_val,
                human_overridden=False,
                override_reason=None,
                sort_order=rule.sort_order or idx,
            )
            session.add(item)
            check_items.append(item)

        # Aggregate overall status
        if counts["FAIL"] > 0:
            overall = "FAIL"
        elif counts["WARN"] > 0:
            overall = "WARN"
        else:
            overall = "PASS"

        result.overall_status = overall
        result.summary_counts = counts
        result.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(result)

        return result
