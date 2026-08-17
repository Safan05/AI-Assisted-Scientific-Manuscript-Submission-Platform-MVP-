# backend/app/services/template_seeder.py
"""
Journal Template and Rule Seeder.

Seeds authoritative baseline templates for 'Nature' and 'PLOS ONE' with
rigorously sourced word caps, required statements, and preflight rule configs.

Sources:
- Nature: https://www.nature.com/nature/for-authors/initial-submission
- Springer Nature Word Limits: https://support.springernature.com/
- PLOS ONE Guidelines: https://journals.plos.org/plosone/s/submission-guidelines
- PLOS ONE Data Availability: https://journals.plos.org/plosone/s/data-availability
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.journal_template import JournalTemplate, TemplateRule

logger = logging.getLogger(__name__)

# ─── SEED DEFINITIONS ─────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE 1: Nature (slug: nature)
# Source: https://www.nature.com/nature/for-authors/initial-submission
# Accessed: 2026 Author Guidelines
# Profile: Restrictive word caps, mandatory competing interests, strict typography
# ─────────────────────────────────────────────────────────────────────────────
NATURE_SEED = {
    "name": "Nature",
    "slug": "nature",
    "description": (
        "International weekly journal publishing top-tier peer-reviewed research across "
        "all scientific fields. Strict word budgets and mandatory disclosure statements."
    ),
    # Nature's primary initial-submission page explicitly states:
    # "a fully referenced ~200 word summary paragraph".
    # (Note: Some secondary aggregator sources cite 150 words for specific letter/format types.
    # We default here to the authoritative 200-word primary guideline).
    "max_abstract_words": 200,
    # Main text guideline: "main text of 2,500 words and 4 modest display items for a typical 6 page article."
    # (Note: 8-page extended articles allow up to 4,300 words and 5-6 display items).
    "max_total_words": 2500,
    "heading_structure": {
        "allowed_levels": [1, 2],
        "standard_sections": ["Introduction", "Results", "Discussion", "Methods"],
        "abstract_format": "fully_referenced_summary_paragraph",
    },
    "reference_format": {
        "style": "nature_numbered",
        "guideline_max_count": 50,  # "as a guideline up to 50 references if needed"
        "citation_style": "superscript",
    },
    "formatting_rules": {
        "equations": "LaTeX or MathType only, sequentially numbered (never embedded as raster images)",
        "line_numbers": "Required on all pages for peer review",
        "figures_max": 4,  # Standard 6-page article guideline
    },
    "title_page_layout": {
        "corresponding_author_statement": "Mandatory 'Correspondence and requests for materials should be addressed to...'",
        "max_title_words": 20,
    },
    "required_statements": {
        "conflict_of_interest": "Mandatory: 'Submission of a competing interests statement is required for all content'",
        "data_availability": "Required for all empirical research papers",
        "author_contributions": "Required: author contribution statement",
    },
    "is_active": True,
    "rules": [
        # Abstract word count: Nature desk-screening hard cap
        # Source: https://www.nature.com/nature/for-authors/initial-submission
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {
                "field": "abstract",
                "max": 200,
                "_source": "https://www.nature.com/nature/for-authors/initial-submission",
            },
            "severity": "FAIL",
            "message": "Abstract exceeds Nature's 200-word summary-paragraph limit.",
            "sort_order": 1,
        },
        # Main text word count: Editorial guideline (treated as WARN, not hard reject)
        # Source: https://www.nature.com/nature/for-authors/initial-submission
        {
            "rule_key": "main_text_word_limit",
            "rule_type": "word_count",
            "rule_config": {
                "field": "sections",
                "max": 2500,
                "_source": "https://www.nature.com/nature/for-authors/initial-submission",
            },
            "severity": "WARN",
            "message": "Main text is approaching or exceeds Nature's ~2,500-word guideline for a standard-length article.",
            "sort_order": 2,
        },
        # Mandatory Competing Interests statement
        # Source: https://www.nature.com/nature/for-authors/initial-submission
        {
            "rule_key": "competing_interests_required",
            "rule_type": "required_field",
            "rule_config": {
                "field_path": "conflict_of_interest",
                "_source": "https://www.nature.com/nature/for-authors/initial-submission",
            },
            "severity": "FAIL",
            "message": "Competing interests statement is required for all Nature submissions and is missing.",
            "sort_order": 3,
        },
        # Reference count guideline (~50 max for standard article)
        # Source: https://www.nature.com/nature/for-authors/initial-submission
        {
            "rule_key": "reference_count_guideline",
            "rule_type": "presence",
            "rule_config": {
                "field": "references",
                "max_count": 50,
                "_source": "https://www.nature.com/nature/for-authors/initial-submission",
            },
            "severity": "WARN",
            "message": "Reference list exceeds Nature's ~50-reference guideline.",
            "sort_order": 4,
        },
    ],
}

# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE 2: PLOS ONE (slug: plos-one)
# Source: https://journals.plos.org/plosone/s/submission-guidelines
# Data Availability: https://journals.plos.org/plosone/s/data-availability
# Profile: Uncapped main text, mandatory data statement, no citations in abstract
# ─────────────────────────────────────────────────────────────────────────────
PLOS_ONE_SEED = {
    "name": "PLOS ONE",
    "slug": "plos-one",
    "description": (
        "Open-access multidisciplinary journal emphasizing reproducibility and method rigor. "
        "No strict word limits on main text, mandatory public data availability statement."
    ),
    # PLOS ONE guidelines: "an unstructured, single-paragraph abstract of no more than 300 words"
    "max_abstract_words": 300,
    # "PLOS ONE imposes no strict word limit on the main text of a research article."
    # Explicitly None (null) to indicate uncapped main text length.
    "max_total_words": None,
    "heading_structure": {
        "allowed_levels": [1, 2, 3],
        "standard_sections": ["Introduction", "Materials and Methods", "Results", "Discussion", "Conclusions"],
        "abstract_format": "unstructured_single_paragraph",
    },
    "reference_format": {
        "style": "plos_vancouver",
        "citation_style": "bracketed_numbers",  # [1], [2] — not superscripts
        "guideline_max_count": None,           # No reference count limit
    },
    "formatting_rules": {
        "abstract_citations": "Forbidden: abstract must contain no citations",
        "equations": "Numbered sequentially with (1), (2)",
        "figures_format": "TIFF or EPS, 300-600 DPI",
    },
    "title_page_layout": {
        "max_title_words": None,
        "corresponding_author": "Must include valid email address",
    },
    "required_statements": {
        # "A Data Availability Statement is mandatory for every submission"
        "data_availability": "Mandatory: Detailed public repository links or explicit accession numbers",
        # Note: Financial disclosure is entered into the online submission system fields,
        # not in the manuscript IR text body.
        "financial_disclosure": "Entered via submission portal (not required in manuscript text)",
        "ethics_statement": "Mandatory for all studies involving humans, animals, or field sites",
    },
    "is_active": True,
    "rules": [
        # Abstract word limit: Hard cap at 300 words
        # Source: https://journals.plos.org/plosone/s/submission-guidelines
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {
                "field": "abstract",
                "max": 300,
                "_source": "https://journals.plos.org/plosone/s/submission-guidelines",
            },
            "severity": "FAIL",
            "message": "Abstract exceeds PLOS ONE's 300-word limit.",
            "sort_order": 1,
        },
        # No citations allowed in abstract: regex heuristic (treated as WARN for human review)
        # Source: https://journals.plos.org/plosone/s/submission-guidelines
        {
            "rule_key": "abstract_no_citations",
            "rule_type": "regex",
            "rule_config": {
                "field": "abstract",
                "pattern": r"\[\d+\]|\(\w+\s+et\s+al",
                "should_not_match": True,
                "_source": "https://journals.plos.org/plosone/s/submission-guidelines",
            },
            "severity": "WARN",
            "message": "Abstract may contain citations — PLOS ONE requires an unstructured abstract with no citations.",
            "sort_order": 2,
        },
        # Mandatory Data Availability Statement
        # Source: https://journals.plos.org/plosone/s/data-availability
        {
            "rule_key": "data_availability_required",
            "rule_type": "required_field",
            "rule_config": {
                "field_path": "data_availability",
                "_source": "https://journals.plos.org/plosone/s/data-availability",
            },
            "severity": "FAIL",
            "message": "PLOS ONE requires a Data Availability Statement for every submission — this is currently missing or empty.",
            "sort_order": 3,
        },
        # Note: No main_text_word_limit rule seeded here because PLOS ONE has no main text limit.
    ],
}


# ─── SEEDING EXECUTION ────────────────────────────────────────────────────────

async def seed_journal_templates(session: AsyncSession) -> list[JournalTemplate]:
    """
    Idempotently seeds baseline Journal Templates ('nature', 'plos-one')
    and their associated Template Rules.
    """
    templates_to_seed = [NATURE_SEED, PLOS_ONE_SEED]
    seeded_templates = []

    for t_data in templates_to_seed:
        slug = t_data["slug"]
        rules_data = t_data.get("rules", [])

        # Check if template already exists by unique slug
        stmt = select(JournalTemplate).where(JournalTemplate.slug == slug)
        res = await session.execute(stmt)
        existing_template = res.scalar_one_or_none()

        fields = {
            "name": t_data["name"],
            "slug": t_data["slug"],
            "description": t_data.get("description"),
            "max_abstract_words": t_data.get("max_abstract_words"),
            "max_total_words": t_data.get("max_total_words"),
            "heading_structure": t_data.get("heading_structure", {}),
            "reference_format": t_data.get("reference_format", {}),
            "formatting_rules": t_data.get("formatting_rules", {}),
            "title_page_layout": t_data.get("title_page_layout", {}),
            "required_statements": t_data.get("required_statements", {}),
            "is_active": t_data.get("is_active", True),
        }

        if existing_template:
            # Update fields in-place
            for k, v in fields.items():
                setattr(existing_template, k, v)
            session.add(existing_template)
            await session.commit()
            await session.refresh(existing_template)
            template_obj = existing_template
            logger.info("Updated existing journal template '%s' (slug: %s)", template_obj.name, slug)
        else:
            template_obj = JournalTemplate(**fields)
            session.add(template_obj)
            await session.commit()
            await session.refresh(template_obj)
            logger.info("Created new journal template '%s' (slug: %s)", template_obj.name, slug)

        # Sync template rules
        # Fetch existing rules for this template
        rules_stmt = select(TemplateRule).where(TemplateRule.template_id == template_obj.id)
        rules_res = await session.execute(rules_stmt)
        existing_rules = {r.rule_key: r for r in rules_res.scalars().all()}

        for r_spec in rules_data:
            r_key = r_spec["rule_key"]
            if r_key in existing_rules:
                # Update rule in-place
                db_rule = existing_rules[r_key]
                db_rule.rule_type = r_spec["rule_type"]
                db_rule.rule_config = r_spec["rule_config"]
                db_rule.severity = r_spec["severity"]
                db_rule.message = r_spec["message"]
                db_rule.sort_order = r_spec["sort_order"]
                session.add(db_rule)
            else:
                db_rule = TemplateRule(
                    template_id=template_obj.id,
                    rule_key=r_key,
                    rule_type=r_spec["rule_type"],
                    rule_config=r_spec["rule_config"],
                    severity=r_spec["severity"],
                    message=r_spec["message"],
                    sort_order=r_spec["sort_order"],
                )
                session.add(db_rule)

        await session.commit()
        seeded_templates.append(template_obj)

    return seeded_templates
