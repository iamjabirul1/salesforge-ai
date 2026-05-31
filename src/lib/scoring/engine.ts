/**
 * Lead Scoring Engine
 * Ported from AI DM Software — scoring/engine.js
 * Scores contacts 0-100 with HOT/WARM/COLD tags based on 6 weighted factors
 */

export interface ScoringRule {
  attribute: ScoringAttribute
  weight: number
  required: boolean
}

export type ScoringAttribute =
  | 'keyword_match'
  | 'recent_activity'
  | 'profile_completeness'
  | 'personalization_hooks'
  | 'location_match'
  | 'engagement_potential'

export type LeadTag = 'HOT' | 'WARM' | 'COLD'

export interface ScoreContribution {
  attribute: ScoringAttribute
  score: number
  weight: number
}

export interface ScoringResult {
  lead_score: number
  score_rationale: string
  tag: LeadTag
  contributions: ScoreContribution[]
}

export interface ScoredCandidate {
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  job_title?: string | null
  location?: string | null
  industry?: string | null
  email?: string | null
  linkedin_url?: string | null
  phone?: string | null
  enrichment_data?: Record<string, any> | null
  personalization_hooks?: Array<{ type: string; text: string; confidence: number }> | null
  // ICP keywords derived from campaign target
  keywords?: string[]
  // ICP locations
  target_locations?: string[]
}

export class LeadScoringEngine {
  /**
   * Score a contact against ICP criteria
   */
  scoreCandidate(candidate: ScoredCandidate, scoringRules?: ScoringRule[]): ScoringResult {
    let totalScore = 0
    let maxPossibleScore = 0
    const contributions: ScoreContribution[] = []

    const rules = scoringRules || this.getDefaultRules()

    for (const rule of rules) {
      const { attribute, weight, required } = rule
      maxPossibleScore += weight

      let score = 0

      switch (attribute) {
        case 'keyword_match':
          score = this.scoreKeywordMatch(candidate) * weight
          break
        case 'recent_activity':
          score = this.scoreRecentActivity(candidate) * weight
          break
        case 'profile_completeness':
          score = this.scoreProfileCompleteness(candidate) * weight
          break
        case 'personalization_hooks':
          score = this.scorePersonalizationHooks(candidate) * weight
          break
        case 'location_match':
          score = this.scoreLocationMatch(candidate) * weight
          break
        case 'engagement_potential':
          score = this.scoreEngagementPotential(candidate) * weight
          break
      }

      totalScore += score
      contributions.push({
        attribute,
        score: Math.round(score),
        weight,
      })

      // If required and score is 0, candidate is disqualified
      if (required && score === 0) {
        return {
          lead_score: 0,
          score_rationale: `Disqualified: Missing required attribute: ${attribute}`,
          tag: 'COLD',
          contributions,
        }
      }
    }

    // Normalize to 0-100
    const normalizedScore = Math.round((totalScore / maxPossibleScore) * 100)
    const tag = this.assignTag(normalizedScore)

    const rationale = this.buildRationale(candidate, normalizedScore, contributions)

    return {
      lead_score: normalizedScore,
      score_rationale: rationale,
      tag,
      contributions,
    }
  }

  /**
   * Score keyword match against ICP keywords (0-1)
   */
  private scoreKeywordMatch(candidate: ScoredCandidate): number {
    const keywords = candidate.keywords || []
    const bio = [
      candidate.job_title,
      candidate.industry,
      candidate.enrichment_data?.headline,
      candidate.enrichment_data?.about,
      candidate.enrichment_data?.bio,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (keywords.length === 0) return 0.5 // Neutral if no keywords

    let matches = 0
    for (const keyword of keywords) {
      if (bio.includes(keyword.toLowerCase())) matches++
    }

    return Math.min(matches / keywords.length, 1)
  }

  /**
   * Score based on recency of engagement signals (0-1)
   */
  private scoreRecentActivity(candidate: ScoredCandidate): number {
    const hooks = candidate.personalization_hooks || []

    const recentHooks = hooks.filter(
      (h) => h.type === 'recent_post' || h.text?.includes('recent') || h.text?.includes('ago')
    )

    if (recentHooks.length === 0) return 0.3
    return Math.min(0.5 + recentHooks.length * 0.25, 1)
  }

  /**
   * Score profile completeness (0-1)
   */
  private scoreProfileCompleteness(candidate: ScoredCandidate): number {
    const fields = [
      candidate.first_name,
      candidate.last_name,
      candidate.job_title,
      candidate.company_name,
      candidate.location,
      candidate.email,
    ]

    const filledFields = fields.filter(
      (f) => f && f !== 'Unknown' && f !== 'Self-employed'
    ).length

    return filledFields / fields.length
  }

  /**
   * Score personalization hooks quality (0-1)
   */
  private scorePersonalizationHooks(candidate: ScoredCandidate): number {
    const hooks = candidate.personalization_hooks || []
    if (hooks.length === 0) return 0

    const avgConfidence =
      hooks.reduce((sum, h) => sum + (h.confidence || 0.5), 0) / hooks.length

    const countBonus = hooks.length >= 3 ? 0.2 : 0
    return Math.min(avgConfidence + countBonus, 1)
  }

  /**
   * Score location match against ICP locations (0-1)
   */
  private scoreLocationMatch(candidate: ScoredCandidate): number {
    const targetLocations = candidate.target_locations || []
    if (!candidate.location || candidate.location === 'Unknown') return 0.5
    if (targetLocations.length === 0) return 0.8 // No location filter = good

    const locationLower = candidate.location.toLowerCase()
    const matched = targetLocations.some((loc) =>
      locationLower.includes(loc.toLowerCase())
    )

    return matched ? 1 : 0.2
  }

  /**
   * Score engagement potential based on enrichment signals (0-1)
   */
  private scoreEngagementPotential(candidate: ScoredCandidate): number {
    const enrichment = candidate.enrichment_data || {}
    const signals: number[] = []

    // Seniority level from Apollo.io
    const seniority = enrichment.seniority_level || enrichment.seniority || ''
    if (['cxo', 'vp', 'director', 'owner', 'founder', 'c_suite'].includes(seniority.toLowerCase())) {
      signals.push(0.9)
    } else if (['manager', 'senior', 'lead'].includes(seniority.toLowerCase())) {
      signals.push(0.7)
    } else if (seniority) {
      signals.push(0.5)
    }

    // LinkedIn connection count
    if (enrichment.linkedin_connections) {
      const connections = Number(enrichment.linkedin_connections)
      if (connections > 500) signals.push(0.8) // Well-connected
      else if (connections > 100) signals.push(0.6)
      else signals.push(0.4)
    }

    // Has phone (more reachable)
    if (candidate.phone) signals.push(0.7)

    // Has LinkedIn profile
    if (candidate.linkedin_url) signals.push(0.6)

    if (signals.length === 0) return 0.5
    return signals.reduce((sum, s) => sum + s, 0) / signals.length
  }

  /**
   * Assign HOT/WARM/COLD tag
   */
  assignTag(score: number): LeadTag {
    if (score >= 70) return 'HOT'
    if (score >= 40) return 'WARM'
    return 'COLD'
  }

  /**
   * Build human-readable rationale
   */
  private buildRationale(
    candidate: ScoredCandidate,
    score: number,
    contributions: ScoreContribution[]
  ): string {
    const tag = this.assignTag(score)
    const topContribs = contributions
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((c) => c.attribute.replace(/_/g, ' '))
      .join(', ')

    const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Contact'
    const title = candidate.job_title || 'professional'
    const company = candidate.company_name || 'their company'

    if (score >= 70) {
      return `${name} is a ${tag} lead. ${title} at ${company} with strong signals in: ${topContribs}.`
    } else if (score >= 40) {
      return `${name} is a ${tag} lead. Moderate match as ${title} at ${company}. Key signals: ${topContribs}.`
    } else {
      return `${name} scored low (${score}/100). Missing key ICP criteria. Signals: ${topContribs || 'insufficient data'}.`
    }
  }

  /**
   * Default scoring rules (can be overridden per campaign)
   */
  getDefaultRules(): ScoringRule[] {
    return [
      { attribute: 'keyword_match', weight: 25, required: false },
      { attribute: 'recent_activity', weight: 20, required: false },
      { attribute: 'profile_completeness', weight: 15, required: false },
      { attribute: 'personalization_hooks', weight: 25, required: false },
      { attribute: 'location_match', weight: 5, required: false },
      { attribute: 'engagement_potential', weight: 10, required: false },
    ]
  }

  /**
   * Build ICP-aware rules from campaign target criteria
   */
  buildRulesFromICP(icp: {
    keywords?: string[]
    locations?: string[]
    job_titles?: string[]
  }): ScoringRule[] {
    const rules = this.getDefaultRules()

    // If specific locations targeted, make location_match more important
    if (icp.locations && icp.locations.length > 0) {
      const locationRule = rules.find((r) => r.attribute === 'location_match')
      if (locationRule) locationRule.weight = 15
    }

    // If specific job titles targeted, keyword_match becomes critical
    if (icp.job_titles && icp.job_titles.length > 0) {
      const keywordRule = rules.find((r) => r.attribute === 'keyword_match')
      if (keywordRule) keywordRule.weight = 35
    }

    return rules
  }
}

export const leadScoringEngine = new LeadScoringEngine()
export default leadScoringEngine
