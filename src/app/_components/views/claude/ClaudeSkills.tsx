"use client";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "../../EmptyState";

type TopSkill = { name: string; count: number };
type Rule = { file: string; title: string };

type SkillData = {
  events: Array<{ timestamp: string; skill: string; event: string }>;
  topSkills: TopSkill[];
  totalInvocations: number;
  rules: Rule[];
};

export function ClaudeSkills() {
  const [data, setData] = useState<SkillData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/skills", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load skills");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const max = data?.topSkills[0]?.count ?? 1;

  return (
    <section id="cl-skills" className="card cl-card cl-skills-section">
      <div className="card-label">
        <span>05 // SKILLS &amp; RULES</span>
        <span className="cl-tag-muted">
          {data ? `${data.totalInvocations} invocations · ${data.rules.length} rules` : "loading…"}
        </span>
      </div>

      {error && <span className="flow-error">{error}</span>}

      <div className="cl-skills-grid">
        <div className="cl-skills-col">
          <h3 className="cl-col-head">Top Skills</h3>
          {data && data.topSkills.length === 0 && (
            <EmptyState
              verb="Invoke"
              explanation="No skill has fired in the <em>recent</em> window."
              glyph="○"
              variant="small"
            />
          )}
          <ul className="cl-skill-rank">
            {data?.topSkills.map((s) => (
              <li key={s.name} className="cl-skill-item">
                <span className="cl-skill-name">{s.name}</span>
                <div className="cl-skill-bar">
                  <div className="cl-skill-fill" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
                <span className="cl-skill-count">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cl-skills-col">
          <h3 className="cl-col-head">Active Rules</h3>
          {data && data.rules.length === 0 && (
            <EmptyState
              verb="Write"
              explanation="Drop a rule into <em>~/.claude/rules/</em> to teach Claude a new constraint."
              glyph="○"
              variant="small"
            />
          )}
          <ul className="cl-rule-list">
            {data?.rules.map((r) => (
              <li key={r.file} className="cl-rule-item">
                <span className="cl-rule-bullet">○</span>
                <span className="cl-rule-title">{r.title}</span>
                <span className="cl-rule-file">{r.file}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
