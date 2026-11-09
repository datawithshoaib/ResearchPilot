from app.graph.nodes import finalize_report


def _finalize(content: str, introduction: str = "", conclusion: str = "") -> str:
    state = {"introduction": introduction, "content": content, "conclusion": conclusion}
    return finalize_report(state)["final_report"]


def test_body_sections_sit_between_intro_and_conclusion():
    report = _finalize(
        "## Insights\n\n## Cheaper Retrieval\n\nText [1].\n\n## Sparse Experts\n\nMore [2].\n\n"
        "## Sources\n[1] https://a.test\n[2] https://b.test",
        introduction="# Title\n\n## Introduction\n\nIntro.",
        conclusion="## Conclusion\n\nWrap up.",
    )

    assert "Insights" not in report
    order = [
        "# Title",
        "## Introduction",
        "## Cheaper Retrieval",
        "## Sparse Experts",
        "## Conclusion",
        "## Sources",
    ]
    positions = [report.index(heading) for heading in order]
    assert positions == sorted(positions)


def test_duplicate_sources_are_merged_and_citations_renumbered():
    report = _finalize(
        "## A\n\nOne [1]. Two [2]. Both [1, 3]. Year [2024].\n\n"
        "### Sources\n[1] https://a.test/x\n[2] https://b.test\n[3] https://a.test/x/"
    )

    body, sources = report.split("## Sources")
    assert "One [1]. Two [2]. Both [1]. Year [2024]." in body
    assert sources.split() == ["[1]", "https://a.test/x", "[2]", "https://b.test"]


def test_stray_source_lists_in_intro_and_conclusion_are_dropped():
    report = _finalize(
        "## Body\n\nText [1].\n\n## Sources\n[1] https://a.test",
        introduction="## Introduction\n\nIntro.\n\n## Sources\n[1] https://a.test",
        conclusion="## Conclusion\n\nEnd.\n\n### Sources\n[1] https://a.test",
    )

    assert report.count("Sources") == 1
    assert report.count("https://a.test") == 1
