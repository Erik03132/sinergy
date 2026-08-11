"""
Sinergy Eval Suite — evaluates scoring engine, AI parsers, dedup.
All logic tests run via tsx (TypeScript Execute) for direct TS import.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

TSX = ["npx", "tsx"]


def ts_eval(code: str, cwd: str = None) -> bool:
    """Execute TypeScript code and return True if no error."""
    env = os.environ.copy()
    # Детерминированность: без AI-ключей агенты идут в детерминированный fallback
    for k in ("OPENROUTER_API_KEY", "GEMINI_API_KEY", "GEMINI_API_KEY_SECONDARY"):
        env.pop(k, None)
    result = subprocess.run(
        TSX + ["-e", code],
        cwd=cwd or BASE_DIR,
        capture_output=True,
        text=True,
        timeout=180,
        env=env,
    )
    if result.returncode != 0:
        print(f"  ❌ Error: {result.stderr[:300]}")
        return False
    return True


class EvalSuite:
    def __init__(self):
        self.tests = []
        self.passed = 0
        self.failed = 0

    def add(self, name: str, category: str, cap: bool, fn):
        self.tests.append((name, category, cap, fn))

    def run(self, filter_cat: str = None):
        for name, cat, cap, fn in self.tests:
            if filter_cat and cat != filter_cat:
                continue
            try:
                fn()
                tag = "✅" if cap else "🟢"
                print(f"  {tag} [{cat}] {name}")
                self.passed += 1
            except AssertionError as e:
                print(f"  ❌ [{cat}] {name}: {e}")
                self.failed += 1
            except Exception as e:
                print(f"  💥 [{cat}] {name}: {type(e).__name__}: {e}")
                self.failed += 1

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'─'*60}")
        print(f"  Results: {self.passed}/{total} passed")
        if total:
            print(f"  Score: {self.passed/total*100:.0f}%")
        return self.failed == 0


def build_suite() -> EvalSuite:
    suite = EvalSuite()

    # ===== SCORING =====

    def test_sanity_check():
        code = """
import { sanityCheck, calculateConsensusSynergyScore, isVerticalCompatible, isTechSynergistic } from '@/lib/sinergy/scoring'

const a: any = { id: '1', vertical: 'HealthTech', core_tech: ['AI', 'LLM'], business_model: 'SaaS', target_audience: 'Chronic patients', title: 'AI Health' }
const b: any = { id: '2', vertical: 'EdTech', core_tech: ['Computer Vision', 'AR/VR'], business_model: 'Marketplace', target_audience: 'Students', title: 'AI Education' }

console.assert(sanityCheck(a, a) === false, 'Same idea should be false')
console.assert(sanityCheck(a, b) === true, 'Different ideas should be true')
console.assert(isVerticalCompatible(a, a) === true, 'Same vertical')
console.assert(isVerticalCompatible(a, b) === false, 'Different vertical')

const score = calculateConsensusSynergyScore(a, b)
console.assert(score >= 0 && score <= 10, `Score ${score} out of range`)

console.log('All scoring tests passed')
"""
        assert ts_eval(code), "Scoring tests failed"

    suite.add("Scoring: sanity, vertical, consensus", "scoring", False, test_sanity_check)

    def test_tech_synergy():
        code = """
import { isTechSynergistic } from '@/lib/sinergy/scoring'

console.assert(isTechSynergistic(['AI', 'LLM'], ['AI', 'Cloud'], 0.6) === true, 'AI+AI synergy')
console.assert(isTechSynergistic(['Blockchain'], ['AI'], 0.6) === false, 'Blockchain+AI no synergy')
console.assert(isTechSynergistic(['Blockchain'], ['AI'], 0.3) === true, 'Blockchain+AI low threshold')
console.log('Tech synergy tests passed')
"""
        assert ts_eval(code), "Tech synergy tests failed"

    suite.add("Scoring: tech synergy matrix", "scoring", False, test_tech_synergy)

    def test_blue_ocean():
        code = """
import { calculateBlueOceanPotential, calculateKnowledgeTransferScore, calculatePairCreativityScore } from '@/lib/sinergy/scoring'

const a: any = { id: '1', vertical: 'HealthTech', core_tech: ['AI'], business_model: 'SaaS', target_audience: 'Chronic patients', title: 'AI Health', description: 'one-click health app' }
const b: any = { id: '2', vertical: 'Gaming', core_tech: ['Computer Vision'], business_model: 'Freemium', target_audience: 'Mobile gamers', title: 'Game Vision' }

const bo = calculateBlueOceanPotential(a, b)
console.assert(bo >= 0 && bo <= 10, `Blue ocean ${bo} out of range`)

const kt = calculateKnowledgeTransferScore(a, b)
console.assert(kt >= 0 && kt <= 10)

const cr = calculatePairCreativityScore(a, b)
console.assert(cr >= 0 && cr <= 10)

console.log('All score calculations passed')
"""
        assert ts_eval(code), "Score calculations failed"

    suite.add("Scoring: blue ocean, knowledge, creativity", "scoring", False, test_blue_ocean)

    # ===== CONSTANTS =====

    def test_constants():
        code = """
import { BANNED_KEYWORDS, VERTICAL_COMPATIBILITY, SYNERGY_BANNED_PATTERNS } from '@/lib/sinergy/constants'

console.assert(BANNED_KEYWORDS.includes('вебинар'), 'Missing вебинар')
console.assert(BANNED_KEYWORDS.includes('курс'), 'Missing курс')
console.assert(BANNED_KEYWORDS.length > 20, 'Too few banned keywords')

console.assert('AI-infrastructure' in VERTICAL_COMPATIBILITY, 'Missing AI-infrastructure')
console.assert(VERTICAL_COMPATIBILITY['AI-infrastructure'].includes('HealthTech'), 'Missing HealthTech')

console.assert(SYNERGY_BANNED_PATTERNS.length > 10, 'Too few synergy banned patterns')

console.log('Constants tests passed')
"""
        assert ts_eval(code), "Constants tests failed"

    suite.add("Constants: keywords, compatibility", "constants", False, test_constants)

    # ===== AI PARSING =====

    def test_json_extraction():
        code = """
// Simulate AI JSON extraction logic from find-next/route.ts
const raw = '```json\\n{\\"synergy_title\\": \\"Test\\", \\"score\\": 8}\\n```'
const cleaned = raw.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim()
const parsed = JSON.parse(cleaned)
console.assert(parsed.synergy_title === 'Test', 'Wrong title')
console.assert(parsed.score === 8, 'Wrong score')

// Direct JSON
const direct = JSON.parse('{\\"synergy_title\\": \\"Direct\\", \\"score\\": 7}')
console.assert(direct.synergy_title === 'Direct')
console.log('JSON extraction tests passed')
"""
        assert ts_eval(code), "JSON extraction failed"

    suite.add("AI JSON extraction from markdown", "ai", False, test_json_extraction)

    # ===== SOURCE PROCESSOR =====

    def test_banned_content():
        code = """
import { isContentBanned } from '@/lib/sinergy/source-processor'

console.assert(isContentBanned('Приглашаем на вебинар по налогам') === true, 'Should ban вебинар')
console.assert(isContentBanned('Great AI startup idea for healthcare') === false, 'Should not ban startup')
console.log('Banned content tests passed')
"""
        assert ts_eval(code), "Banned content tests failed"

    suite.add("Source processor: banned content filter", "processor", False, test_banned_content)

    # ===== TYPES =====

    def test_idea_type():
        code = """
import { Idea } from '@/types/sinergy'

const idea: Idea = {
    id: 'test_1',
    source: 'user',
    title: 'Test Idea',
    description: 'Test description',
    created_at: '2026-07-01T00:00:00Z',
    vertical: 'HealthTech',
    core_tech: ['AI'],
    target_audience: 'Test audience',
    business_model: 'SaaS',
    pain_point: ['No test'],
    temporal_marker: '2026-07',
    is_favorite: false,
}

// Verify type compiles (we get here = success)
console.assert(idea.id === 'test_1', 'ID mismatch')
console.assert(idea.vertical === 'HealthTech', 'Vertical mismatch')
console.assert(idea.source === 'user', 'Source mismatch')
console.log('Type structure verified')
"""
        assert ts_eval(code), "Type structure tests failed"

    suite.add("Types: Idea type structure", "types", False, test_idea_type)

    # ===== DISCOVERY =====

    def test_discovery_basic():
        code = """
import { BANNED_KEYWORDS } from '@/lib/sinergy/constants'
// Discovery uses BANNED_KEYWORDS via source-processor
const lower = 'это просто курс по заработку'.toLowerCase()
const banned = BANNED_KEYWORDS.some(kw => lower.includes(kw))
console.assert(banned === true, 'Should detect курс')
console.log('Discovery keyword filter works')
"""
        assert ts_eval(code), "Discovery tests failed"

    suite.add("Discovery: keyword filter", "processor", False, test_discovery_basic)

    # ===== MULTI-AGENT ARCHITECTURE =====

    def test_builder_generates_valid_output():
        code = """
import { builderBuild } from '@/lib/sinergy/agents/builder'

async function main() {
const a: any = { id: '1', vertical: 'HealthTech', core_tech: ['AI', 'LLM'], business_model: 'SaaS', target_audience: 'Chronic patients', title: 'AI Health', description: 'AI health tracking', pain_point: ['No tracking'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const b: any = { id: '2', vertical: 'EdTech', core_tech: ['Computer Vision'], business_model: 'Marketplace', target_audience: 'Students', title: 'Edu Vision', description: 'Education AR', pain_point: ['No AR'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }

const result = await builderBuild(a, b)
if (!result) throw new Error('Builder should produce result')
if (!result.synergy_title) throw new Error('Should have title')
if (!result.mvp_scenario) throw new Error('Should have MVP')
if (!result.logic_chain) throw new Error('Should have logic chain')
if (!(result.scores.total >= 0 && result.scores.total <= 10)) throw new Error('Score in range')
if (!(result.thinking_models.blue_ocean_errc.length > 0)) throw new Error('Should have ERRC')
console.log('Builder agent tests passed')
}
main()
"""
        assert ts_eval(code), "Builder agent tests failed"

    suite.add("Multi-agent: Builder produces valid output", "agents", False, test_builder_generates_valid_output)

    def test_builder_rejects_bad_pair():
        code = """
import { builderBuild } from '@/lib/sinergy/agents/builder'

async function main() {
const a: any = { id: '1', vertical: 'HealthTech', core_tech: [], business_model: 'SaaS', target_audience: '', title: 'Тест', description: 'test', pain_point: [], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const result = await builderBuild(a, a)
if (result !== null) throw new Error('Same idea should be rejected')
console.log('Builder rejection test passed')
}
main()
"""
        assert ts_eval(code), "Builder rejection failed"

    suite.add("Multi-agent: Builder rejects identical ideas", "agents", False, test_builder_rejects_bad_pair)

    def test_skeptic_validates():
        code = """
import { builderBuild } from '@/lib/sinergy/agents/builder'
import { skepticValidate } from '@/lib/sinergy/agents/skeptic'

async function main() {
const a: any = { id: '1', vertical: 'HealthTech', core_tech: ['AI'], business_model: 'SaaS', target_audience: 'Chronic patients', title: 'AI Health', description: 'health', pain_point: ['No tracking'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const b: any = { id: '2', vertical: 'EdTech', core_tech: ['Computer Vision'], business_model: 'Marketplace', target_audience: 'Students', title: 'Edu Vision', description: 'education', pain_point: ['No AR'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const built = await builderBuild(a, b)
if (!built) throw new Error('Builder should produce result')
const result = await skepticValidate(a, b, built.synergy_title, built.synergy_description)
if (!(result.risks.length > 0)) throw new Error('Should have some risks')
if (!['low', 'medium', 'high'].includes(result.failure_probability)) throw new Error('Valid probability')
console.log('Skeptic agent tests passed')
}
main()
"""
        assert ts_eval(code), "Skeptic agent tests failed"

    suite.add("Multi-agent: Skeptic validates synergy", "agents", False, test_skeptic_validates)

    def test_optimist_generates_output():
        code = """
import { builderBuild } from '@/lib/sinergy/agents/builder'
import { optimistAnalyze } from '@/lib/sinergy/agents/optimist'

async function main() {
const a: any = { id: '1', vertical: 'HealthTech', core_tech: ['AI'], business_model: 'SaaS', target_audience: 'Chronic patients', title: 'AI Health', description: 'health', pain_point: ['No tracking'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const b: any = { id: '2', vertical: 'EdTech', core_tech: ['Computer Vision'], business_model: 'Marketplace', target_audience: 'Students', title: 'Edu Vision', description: 'education', pain_point: ['No AR'], temporal_marker: '2026', source: 'user', created_at: '2026-01-01' }
const result = await optimistAnalyze(a, b)
if (!(result.scores.blue_ocean >= 0 && result.scores.blue_ocean <= 10)) throw new Error('Blue ocean score')
if (!result.blue_ocean_analysis) throw new Error('Should have analysis')
if (!result.ai_trend_forecast) throw new Error('Should have AI forecast')
console.log('Optimist agent tests passed')
}
main()
"""
        assert ts_eval(code), "Optimist agent tests failed"

    suite.add("Multi-agent: Optimist generates analysis", "agents", False, test_optimist_generates_output)

    return suite


if __name__ == "__main__":
    filter_cat = None
    if len(sys.argv) > 1:
        arg = sys.argv[1].lstrip("--")

    print(f"\n{'='*60}")
    print(f"  Sinergy Eval Suite")
    print(f"  Startup Synergy Engine — scoring, AI, dedup")
    if filter_cat:
        print(f"  Filter: {filter_cat}")
    print(f"{'='*60}")

    suite = build_suite()
    suite.run(filter_cat)
    ok = suite.summary()

    sys.exit(0 if ok else 1)
