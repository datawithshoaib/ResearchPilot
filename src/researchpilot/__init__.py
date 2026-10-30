"""ResearchPilot: a multi-agent research workflow built on LangGraph."""

__version__ = "0.1.0"


def main() -> None:
    from researchpilot.api.app import run

    run()
