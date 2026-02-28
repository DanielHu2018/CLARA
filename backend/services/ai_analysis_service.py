"""
CLARA — AI Analysis Service
Structured AI analysis for portfolio and hedge pages with Gemini + deterministic fallback.
"""

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List

from config import settings

logger = logging.getLogger("CLARA.ai_analysis")


class AIAnalysisService:
    def __init__(self) -> None:
        self.provider = (settings.AI_PROVIDER or "auto").lower()
        self.gemini_model = settings.GEMINI_MODEL or "gemini-2.0-flash"
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.timeout = max(5, settings.AI_TIMEOUT_SECONDS)

    @property
    def gemini_enabled(self) -> bool:
        key = (self.gemini_api_key or "").strip()
        return bool(key and key != "your_gemini_key_here")

    async def analyze_portfolio(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if self._use_gemini():
            ai = self._analyze_portfolio_gemini(payload)
            if ai:
                return ai
        return self._portfolio_fallback(payload)

    async def analyze_hedges(self, proposals: List[Dict[str, Any]]) -> Dict[str, Any]:
        if self._use_gemini():
            ai = self._analyze_hedges_gemini(proposals)
            if ai:
                return ai
        return self._hedges_fallback(proposals)

    def _use_gemini(self) -> bool:
        if self.provider == "watsonx":
            return False
        if self.provider == "gemini":
            return self.gemini_enabled
        return self.gemini_enabled

    def _gemini_generate_json(self, prompt: str) -> Dict[str, Any] | None:
        if not self.gemini_enabled:
            return None

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        )

        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 900,
                "responseMimeType": "application/json",
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
            logger.warning("Gemini HTTP error: %s", msg)
            return None
        except Exception as e:
            logger.warning("Gemini call failed: %s", e)
            return None

        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            return None

        return self._parse_json_text(text)

    def _parse_json_text(self, text: str) -> Dict[str, Any] | None:
        if not text:
            return None
        text = text.strip()

        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        json_match = re.search(r"\{[\s\S]*\}", text)
        if not json_match:
            return None

        try:
            parsed = json.loads(json_match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    def _normalize_result(self, candidate: Dict[str, Any], provider: str) -> Dict[str, Any]:
        key_risks = candidate.get("key_risks") or []
        recommended_actions = candidate.get("recommended_actions") or []
        assumptions = candidate.get("assumptions") or []
        missing_data = candidate.get("missing_data") or []

        confidence = candidate.get("confidence", 0.6)
        try:
            confidence = float(confidence)
        except Exception:
            confidence = 0.6
        confidence = max(0.0, min(1.0, confidence))

        summary = str(candidate.get("summary") or "AI summary unavailable.").strip()
        needs_review = bool(candidate.get("needs_review", confidence < 0.65))

        return {
            "summary": summary,
            "confidence": round(confidence, 2),
            "key_risks": [str(x) for x in key_risks][:5],
            "recommended_actions": [str(x) for x in recommended_actions][:5],
            "assumptions": [str(x) for x in assumptions][:5],
            "missing_data": [str(x) for x in missing_data][:5],
            "needs_review": needs_review,
            "provider": provider,
        }

    def _analyze_portfolio_gemini(self, payload: Dict[str, Any]) -> Dict[str, Any] | None:
        prompt = (
            "You are a senior portfolio risk analyst. Analyze the portfolio payload and return JSON only. "
            "Do not include markdown. Keep concise and evidence-based.\n\n"
            "Return exactly this schema:\n"
            "{\n"
            '  "summary": string,\n'
            '  "confidence": number,\n'
            '  "key_risks": string[],\n'
            '  "recommended_actions": string[],\n'
            '  "assumptions": string[],\n'
            '  "missing_data": string[],\n'
            '  "needs_review": boolean\n'
            "}\n\n"
            "Rules:\n"
            "- Mention concentration, beta exposure, and downside risk if relevant.\n"
            "- Keep confidence conservative if data is incomplete.\n"
            "- No investment guarantees.\n\n"
            f"Portfolio payload:\n{json.dumps(payload, ensure_ascii=False)}"
        )
        raw = self._gemini_generate_json(prompt)
        if not raw:
            return None
        return self._normalize_result(raw, provider="gemini")

    def _analyze_hedges_gemini(self, proposals: List[Dict[str, Any]]) -> Dict[str, Any] | None:
        prompt = (
            "You are a derivatives risk analyst. Evaluate hedge proposals and return JSON only. "
            "Do not include markdown. Keep concise and practical.\n\n"
            "Return exactly this schema:\n"
            "{\n"
            '  "summary": string,\n'
            '  "confidence": number,\n'
            '  "key_risks": string[],\n'
            '  "recommended_actions": string[],\n'
            '  "assumptions": string[],\n'
            '  "missing_data": string[],\n'
            '  "needs_review": boolean\n'
            "}\n\n"
            "Rules:\n"
            "- Highlight cost-efficiency and residual-tail tradeoffs.\n"
            "- Mention concentration or liquidity concerns.\n"
            "- Keep confidence conservative if critical data is missing.\n\n"
            f"Hedge proposals:\n{json.dumps(proposals, ensure_ascii=False)}"
        )
        raw = self._gemini_generate_json(prompt)
        if not raw:
            return None
        return self._normalize_result(raw, provider="gemini")

    def _portfolio_fallback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        total_value = float(payload.get("total_value") or 0)
        total_gain_loss_pct = float(payload.get("total_gain_loss_pct") or 0)
        portfolio_beta = float(payload.get("portfolio_beta") or 1)

        top_holdings = payload.get("top_holdings") or []
        concentration = 0.0
        if top_holdings:
            concentration = sum(float(h.get("weight_pct") or 0) for h in top_holdings[:3])

        key_risks: List[str] = []
        actions: List[str] = []
        assumptions: List[str] = [
            "Analysis uses provided portfolio snapshot and heuristic fallback logic.",
            "Market liquidity and transaction costs are not explicitly modeled.",
        ]
        missing = [
            "Correlation matrix and factor exposures",
            "Options greeks / hedge ratios",
            "Historical drawdown and realized volatility window",
        ]

        if concentration >= 55:
            key_risks.append(f"Top-3 holdings concentration is elevated at {concentration:.1f}%.")
            actions.append("Reduce concentration by trimming largest positions or adding diversifiers.")

        if portfolio_beta > 1.25:
            key_risks.append(f"Portfolio beta is high at {portfolio_beta:.2f}, amplifying market downside.")
            actions.append("Add defensive or low-beta hedges to reduce directional risk.")
        elif portfolio_beta < 0.85:
            key_risks.append(f"Portfolio beta is defensive at {portfolio_beta:.2f}, which may cap upside in rallies.")

        if total_gain_loss_pct < -8:
            key_risks.append(f"Unrealized performance is weak at {total_gain_loss_pct:.2f}%, suggesting drawdown pressure.")
            actions.append("Reassess stop-loss levels and position-level thesis for laggards.")
        elif total_gain_loss_pct > 20:
            key_risks.append(f"Strong gains ({total_gain_loss_pct:.2f}%) increase profit-protection importance.")
            actions.append("Harvest partial gains and raise trailing stops on extended winners.")

        if not key_risks:
            key_risks.append("Risk posture appears balanced under current snapshot, but scenario stress remains necessary.")

        if not actions:
            actions.append("Run stress scenarios and validate tail-risk limits before changing allocations.")

        summary = (
            f"Portfolio snapshot (${total_value:,.0f}) suggests "
            f"{'elevated' if portfolio_beta > 1.25 or concentration >= 55 else 'moderate'} risk. "
            f"Focus on concentration control, downside protection, and stress-test validation."
        )

        return {
            "summary": summary,
            "confidence": 0.62,
            "key_risks": key_risks[:5],
            "recommended_actions": actions[:5],
            "assumptions": assumptions,
            "missing_data": missing,
            "needs_review": True,
            "provider": "fallback",
        }

    def _hedges_fallback(self, proposals: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not proposals:
            return {
                "summary": "No hedge proposals available for analysis.",
                "confidence": 0.4,
                "key_risks": ["No instruments provided."],
                "recommended_actions": ["Provide hedge candidates with cost and effectiveness metrics."],
                "assumptions": ["Fallback mode without LLM."],
                "missing_data": ["Instrument-level liquidity", "Scenario payout profiles"],
                "needs_review": True,
                "provider": "fallback",
            }

        sorted_by_eff = sorted(proposals, key=lambda p: float(p.get("effectiveness_pct", 0)), reverse=True)
        sorted_by_cost = sorted(proposals, key=lambda p: float(p.get("cost_pct", 0)))
        avg_residual = sum(float(p.get("residual_tail", 0)) for p in proposals) / len(proposals)

        best_eff = sorted_by_eff[0]
        best_cost = sorted_by_cost[0]

        key_risks = []
        actions = []

        if avg_residual > 0.35:
            key_risks.append(f"Average residual tail risk remains high at {avg_residual:.2f}.")
            actions.append("Shift budget toward higher-convexity hedges and tighten hedge coverage targets.")
        else:
            key_risks.append(f"Residual tail risk is moderate with average {avg_residual:.2f}.")

        actions.append(
            f"Prioritize {best_eff.get('instrument', 'top hedge')} for effectiveness ({best_eff.get('effectiveness_pct', 0)}%)."
        )
        actions.append(
            f"Use {best_cost.get('instrument', 'lowest-cost hedge')} as a budget anchor (cost {best_cost.get('cost_pct', 0)}%)."
        )

        return {
            "summary": "Hedge set appears workable but requires balancing cost efficiency against remaining tail exposure.",
            "confidence": 0.64,
            "key_risks": key_risks[:5],
            "recommended_actions": actions[:5],
            "assumptions": [
                "Effectiveness and residual metrics are treated as comparable across instruments.",
                "Execution slippage and basis risk are not modeled in fallback mode.",
            ],
            "missing_data": [
                "Per-scenario payoff curves",
                "Liquidity by execution window",
                "Cross-hedge correlation effects",
            ],
            "needs_review": True,
            "provider": "fallback",
        }


ai_analysis_service = AIAnalysisService()
