import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResultCard } from "./result-card";

describe("ResultCard", () => {
  it("renders title and body paragraphs", () => {
    render(
      <ResultCard
        title="Svenska"
        subtitle="sv · strong"
        body={"Första stycket.\n\nAndra stycket."}
      />,
    );
    expect(screen.getByText("Svenska")).toBeInTheDocument();
    expect(screen.getByText("sv · strong")).toBeInTheDocument();
    expect(screen.getByText("Första stycket.")).toBeInTheDocument();
    expect(screen.getByText("Andra stycket.")).toBeInTheDocument();
  });

  it("renders a badge when supplied", () => {
    render(
      <ResultCard title="Arabiska" body="test" badge="ar" dir="rtl" />,
    );
    expect(screen.getByText("ar")).toBeInTheDocument();
    // The body container should carry dir="rtl"
    const card = screen.getByTestId("result-card");
    const rtlPanel = card.querySelector('[dir="rtl"]');
    expect(rtlPanel).not.toBeNull();
  });

  it("shows an empty-state message when body is blank", () => {
    render(<ResultCard title="x" body="" />);
    expect(screen.getByText("(tomt)")).toBeInTheDocument();
  });
});
