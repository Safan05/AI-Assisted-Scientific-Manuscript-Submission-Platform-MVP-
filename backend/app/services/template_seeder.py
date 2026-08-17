# backend/app/services/template_seeder.py
"""
Journal Template and Rule Seeder.

Seeds authoritative baseline templates for:
  - Nature
  - PLOS ONE
  - IEEE Transactions
  - Medical Image Analysis
  - Radiology
  - MIDL (Medical Imaging with Deep Learning)

All templates are seeded idempotently (safe to re-run).
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.journal_template import JournalTemplate, TemplateRule

logger = logging.getLogger(__name__)

# ─── TEMPLATE 1: Nature ───────────────────────────────────────────────────────
NATURE_SEED = {
    "name": "Nature",
    "slug": "nature",
    "description": (
        "International weekly journal publishing top-tier peer-reviewed research across "
        "all scientific fields. Strict word budgets and mandatory disclosure statements."
    ),
    "max_abstract_words": 200,
    "max_total_words": 2500,
    "heading_structure": {
        "allowed_levels": [1, 2],
        "standard_sections": ["Introduction", "Results", "Discussion", "Methods"],
        "abstract_format": "fully_referenced_summary_paragraph",
    },
    "reference_format": {
        "style": "nature_numbered",
        "guideline_max_count": 50,
        "citation_style": "superscript",
    },
    "formatting_rules": {
        "equations": "LaTeX or MathType only, sequentially numbered",
        "line_numbers": "Required on all pages for peer review",
        "figures_max": 4,
    },
    "title_page_layout": {
        "corresponding_author_statement": "Mandatory",
        "max_title_words": 20,
    },
    "required_statements": {
        "conflict_of_interest": "Mandatory",
        "data_availability": "Required for all empirical research papers",
        "author_contributions": "Required",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 200},
            "severity": "FAIL",
            "message": "Abstract exceeds Nature's 200-word summary-paragraph limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "main_text_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "sections", "max": 2500},
            "severity": "WARN",
            "message": "Main text approaches or exceeds Nature's ~2,500-word guideline.",
            "sort_order": 2,
        },
        {
            "rule_key": "competing_interests_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "conflict_of_interest"},
            "severity": "FAIL",
            "message": "Competing interests statement is required for all Nature submissions.",
            "sort_order": 3,
        },
        {
            "rule_key": "reference_count_guideline",
            "rule_type": "presence",
            "rule_config": {"field": "references", "max_count": 50},
            "severity": "WARN",
            "message": "Reference list exceeds Nature's ~50-reference guideline.",
            "sort_order": 4,
        },
    ],
}

# ─── TEMPLATE 2: PLOS ONE ─────────────────────────────────────────────────────
PLOS_ONE_SEED = {
    "name": "PLOS ONE",
    "slug": "plos-one",
    "description": (
        "Open-access multidisciplinary journal emphasizing reproducibility and method rigor. "
        "No strict word limits on main text, mandatory public data availability statement."
    ),
    "max_abstract_words": 300,
    "max_total_words": None,
    "heading_structure": {
        "allowed_levels": [1, 2, 3],
        "standard_sections": ["Introduction", "Materials and Methods", "Results", "Discussion"],
        "abstract_format": "unstructured_single_paragraph",
    },
    "reference_format": {
        "style": "plos_vancouver",
        "citation_style": "bracketed_numbers",
        "guideline_max_count": None,
    },
    "formatting_rules": {
        "abstract_citations": "Forbidden",
        "equations": "Numbered sequentially with (1), (2)",
        "figures_format": "TIFF or EPS, 300-600 DPI",
    },
    "title_page_layout": {
        "max_title_words": None,
        "corresponding_author": "Must include valid email address",
    },
    "required_statements": {
        "data_availability": "Mandatory: detailed public repository links or accession numbers",
        "ethics_statement": "Mandatory for studies involving humans, animals, or field sites",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 300},
            "severity": "FAIL",
            "message": "Abstract exceeds PLOS ONE's 300-word limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "abstract_no_citations",
            "rule_type": "regex",
            "rule_config": {
                "field": "abstract",
                "pattern": r"\[\d+\]|\(\w+\s+et\s+al",
                "should_not_match": True,
            },
            "severity": "WARN",
            "message": "Abstract may contain citations: PLOS ONE requires no citations in abstract.",
            "sort_order": 2,
        },
        {
            "rule_key": "data_availability_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "data_availability"},
            "severity": "FAIL",
            "message": "PLOS ONE requires a Data Availability Statement for every submission.",
            "sort_order": 3,
        },
    ],
}

# ─── TEMPLATE 3: IEEE Transactions ───────────────────────────────────────────
IEEE_SEED = {
    "name": "IEEE Transactions",
    "slug": "ieee",
    "description": (
        "IEEE Transactions journals covering electrical engineering, computer science, "
        "and related disciplines. Double-column format, structured abstract, strict style guide."
    ),
    "max_abstract_words": 250,
    "max_total_words": 8000,
    "heading_structure": {
        "allowed_levels": [1, 2, 3],
        "standard_sections": ["Introduction", "Related Work", "Methods", "Experiments", "Conclusion"],
        "abstract_format": "structured_150_250_words",
        "notes": "Roman numerals for major sections (I., II., etc.)",
    },
    "reference_format": {
        "style": "ieee_numbered",
        "citation_style": "bracketed_numbers",
        "guideline_max_count": None,
        "notes": "References in order of appearance, bracketed [1]",
    },
    "formatting_rules": {
        "columns": "double_column",
        "font": "Times New Roman 10pt",
        "keywords": "3-5 IEEE taxonomy keywords mandatory",
        "equations": "Numbered in parentheses (1), centered",
    },
    "title_page_layout": {
        "max_title_words": 15,
        "author_footnote": "Author affiliations as first-page footnote",
        "corresponding_author": "Indicated by asterisk (*)",
    },
    "required_statements": {
        "conflict_of_interest": "Required for IEEE Open Access; recommended for all",
        "author_contributions": "Optional but recommended",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 250},
            "severity": "FAIL",
            "message": "Abstract exceeds IEEE's 250-word limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "abstract_min_words",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "min": 150},
            "severity": "WARN",
            "message": "Abstract is shorter than IEEE's recommended 150-word minimum.",
            "sort_order": 2,
        },
        {
            "rule_key": "keywords_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "keywords", "min_count": 3},
            "severity": "FAIL",
            "message": "IEEE requires 3–5 keywords from the IEEE Taxonomy.",
            "sort_order": 3,
        },
        {
            "rule_key": "main_text_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "sections", "max": 8000},
            "severity": "WARN",
            "message": "Main text approaches or exceeds the IEEE ~8,000-word guideline.",
            "sort_order": 4,
        },
    ],
}

# ─── TEMPLATE 4: Medical Image Analysis ──────────────────────────────────────
MIA_SEED = {
    "name": "Medical Image Analysis",
    "slug": "medical-image-analysis",
    "description": (
        "Elsevier journal focused on mathematical, statistical, and computational methods "
        "for medical image analysis. Requires rigorous quantitative evaluation."
    ),
    "max_abstract_words": 300,
    "max_total_words": 10000,
    "heading_structure": {
        "allowed_levels": [1, 2, 3],
        "standard_sections": [
            "Introduction", "Related Work", "Methods", "Experiments and Results",
            "Discussion", "Conclusion"
        ],
        "abstract_format": "unstructured_up_to_300_words",
    },
    "reference_format": {
        "style": "elsevier_harvard",
        "citation_style": "author_year",
        "notes": "Author–year in text, alphabetical reference list",
    },
    "formatting_rules": {
        "highlights": "3–5 bullet highlights mandatory (max 85 chars each)",
        "figures_format": "EPS, TIFF, or PDF; minimum 300 DPI for halftones",
        "supplementary": "Extensive supplementary materials encouraged",
    },
    "title_page_layout": {
        "highlights": "Mandatory: 3–5 novel findings (bullet points)",
        "corresponding_author": "Mandatory with valid email",
        "max_title_words": 25,
    },
    "required_statements": {
        "data_availability": "Strongly encouraged; code/data repository link preferred",
        "ethics_statement": "Required for studies involving human subjects",
        "conflict_of_interest": "Mandatory Elsevier CRediT author statement",
        "author_contributions": "CRediT taxonomy mandatory",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 300},
            "severity": "FAIL",
            "message": "Abstract exceeds Medical Image Analysis's 300-word limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "highlights_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "highlights", "note": "Add 3-5 highlights to title page"},
            "severity": "WARN",
            "message": "Medical Image Analysis requires 3–5 research highlights (each ≤ 85 chars).",
            "sort_order": 2,
        },
        {
            "rule_key": "author_contributions_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "author_contributions"},
            "severity": "FAIL",
            "message": "CRediT author contribution statement is mandatory for Medical Image Analysis.",
            "sort_order": 3,
        },
        {
            "rule_key": "keywords_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "keywords", "min_count": 3},
            "severity": "FAIL",
            "message": "Medical Image Analysis requires at least 3 keywords.",
            "sort_order": 4,
        },
        {
            "rule_key": "ethics_statement_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "ethics_statement"},
            "severity": "WARN",
            "message": "Ethics statement may be required for studies involving human subjects.",
            "sort_order": 5,
        },
    ],
}

# ─── TEMPLATE 5: Radiology (RSNA) ────────────────────────────────────────────
RADIOLOGY_SEED = {
    "name": "Radiology",
    "slug": "radiology",
    "description": (
        "RSNA flagship journal publishing clinical and translational radiology research. "
        "Structured abstract required; strict word, figure, and table limits."
    ),
    "max_abstract_words": 300,
    "max_total_words": 3500,
    "heading_structure": {
        "allowed_levels": [1, 2],
        "standard_sections": [
            "Introduction", "Materials and Methods", "Results", "Discussion"
        ],
        "abstract_format": "structured_background_purpose_materials_results_conclusion",
    },
    "reference_format": {
        "style": "rsna_numbered",
        "citation_style": "superscript",
        "guideline_max_count": 40,
        "notes": "Superscript numbered references, max ~40",
    },
    "formatting_rules": {
        "figures_max": 6,
        "tables_max": 4,
        "summary_statement": "One-sentence summary statement required (≤ 30 words)",
        "key_results": "3 key results bullet points required",
    },
    "title_page_layout": {
        "max_title_words": 15,
        "summary_statement": "Mandatory: one sentence (≤ 30 words)",
        "key_results": "3 bullet key results mandatory",
        "corresponding_author": "Mandatory with institution, address, email",
    },
    "required_statements": {
        "conflict_of_interest": "Mandatory: all authors must disclose potential conflicts",
        "data_availability": "Required: dataset accession or statement",
        "ethics_statement": "Mandatory for human and animal studies",
        "funding": "Mandatory: funding sources and grant numbers",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 300},
            "severity": "FAIL",
            "message": "Abstract exceeds Radiology's 300-word limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "main_text_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "sections", "max": 3500},
            "severity": "WARN",
            "message": "Main text approaches or exceeds Radiology's ~3,500-word guideline.",
            "sort_order": 2,
        },
        {
            "rule_key": "competing_interests_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "conflict_of_interest"},
            "severity": "FAIL",
            "message": "Competing interests / conflict of interest statement is mandatory for Radiology.",
            "sort_order": 3,
        },
        {
            "rule_key": "ethics_statement_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "ethics_statement"},
            "severity": "FAIL",
            "message": "Ethics / IRB approval statement is mandatory for Radiology.",
            "sort_order": 4,
        },
        {
            "rule_key": "data_availability_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "data_availability"},
            "severity": "WARN",
            "message": "Radiology requires a data availability / accession statement.",
            "sort_order": 5,
        },
        {
            "rule_key": "reference_count_guideline",
            "rule_type": "presence",
            "rule_config": {"field": "references", "max_count": 40},
            "severity": "WARN",
            "message": "Reference list exceeds Radiology's ~40-reference guideline.",
            "sort_order": 6,
        },
    ],
}

# ─── TEMPLATE 6: MIDL (Medical Imaging with Deep Learning) ───────────────────
MIDL_SEED = {
    "name": "MIDL",
    "slug": "midl",
    "description": (
        "Medical Imaging with Deep Learning — proceedings and journal track for deep "
        "learning methods in medical imaging. PMLR-published open-access venue."
    ),
    "max_abstract_words": 250,
    "max_total_words": 8000,
    "heading_structure": {
        "allowed_levels": [1, 2, 3],
        "standard_sections": [
            "Introduction", "Related Work", "Methods", "Experiments", "Results",
            "Discussion", "Conclusion"
        ],
        "abstract_format": "single_paragraph_up_to_250_words",
    },
    "reference_format": {
        "style": "midl_author_year",
        "citation_style": "author_year",
        "notes": "Harvard / author–year style, alphabetical reference list",
    },
    "formatting_rules": {
        "format": "LaTeX (MIDL style file required for camera-ready)",
        "code_availability": "Code/model weights repository strongly encouraged",
        "reproducibility": "Method reproducibility and ablation study expected",
    },
    "title_page_layout": {
        "max_title_words": 20,
        "corresponding_author": "Mandatory with email",
    },
    "required_statements": {
        "data_availability": "Required: public dataset reference or access statement",
        "conflict_of_interest": "Required for journal track",
        "author_contributions": "Required for journal track (CRediT recommended)",
    },
    "is_active": True,
    "rules": [
        {
            "rule_key": "abstract_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "abstract", "max": 250},
            "severity": "FAIL",
            "message": "Abstract exceeds MIDL's 250-word limit.",
            "sort_order": 1,
        },
        {
            "rule_key": "keywords_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "keywords", "min_count": 3},
            "severity": "WARN",
            "message": "MIDL requires at least 3 keywords.",
            "sort_order": 2,
        },
        {
            "rule_key": "data_availability_required",
            "rule_type": "required_field",
            "rule_config": {"field_path": "data_availability"},
            "severity": "WARN",
            "message": "MIDL strongly requires a data availability statement or public dataset reference.",
            "sort_order": 3,
        },
        {
            "rule_key": "main_text_word_limit",
            "rule_type": "word_count",
            "rule_config": {"field": "sections", "max": 8000},
            "severity": "WARN",
            "message": "Main text approaches or exceeds MIDL's ~8,000-word guideline.",
            "sort_order": 4,
        },
    ],
}


# ─── SEEDING EXECUTION ────────────────────────────────────────────────────────

TEMPLATES_TO_SEED = [
    NATURE_SEED,
    PLOS_ONE_SEED,
    IEEE_SEED,
    MIA_SEED,
    RADIOLOGY_SEED,
    MIDL_SEED,
]


async def seed_journal_templates(session: AsyncSession) -> list[JournalTemplate]:
    """
    Idempotently seeds all journal templates and their associated rules.
    Safe to call on every startup — already-existing records are updated in-place.
    """
    seeded_templates = []

    for t_data in TEMPLATES_TO_SEED:
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
            for k, v in fields.items():
                setattr(existing_template, k, v)
            session.add(existing_template)
            await session.commit()
            await session.refresh(existing_template)
            template_obj = existing_template
            logger.info("Updated template '%s' (slug: %s)", template_obj.name, slug)
        else:
            template_obj = JournalTemplate(**fields)
            session.add(template_obj)
            await session.commit()
            await session.refresh(template_obj)
            logger.info("Created template '%s' (slug: %s)", template_obj.name, slug)

        # Sync template rules
        rules_stmt = select(TemplateRule).where(TemplateRule.template_id == template_obj.id)
        rules_res = await session.execute(rules_stmt)
        existing_rules = {r.rule_key: r for r in rules_res.scalars().all()}

        for r_spec in rules_data:
            r_key = r_spec["rule_key"]
            if r_key in existing_rules:
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
