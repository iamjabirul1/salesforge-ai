/**
 * Platform Compliance Checker
 * Ported from AI DM Software — compliance/checker.js
 * Validates messages against platform-specific rules before sending
 */

import { PLATFORM_RULES, SocialPlatform } from './platform-rules'

export interface ComplianceFlag {
  type: 'length_violation' | 'disallowed_pattern' | 'link_policy_violation' | 'spam_trigger' | 'hashtag_limit'
  severity: 'error' | 'warning'
  message: string
  action: string
  detail?: string
}

export interface ComplianceResult {
  is_compliant: boolean
  compliance_flags: ComplianceFlag[]
  violations: string[]
  platform_rules: {
    max_length: number
    max_daily_messages: number
    tone_requirements: string
    hashtag_limit: number
  }
  suggestions: Array<{ issue: string; fix: string; automated: boolean }>
}

export class PlatformComplianceChecker {
  /**
   * Check a message against platform-specific compliance rules
   */
  checkCompliance(message: string, platform: SocialPlatform): ComplianceResult {
    const rules = PLATFORM_RULES[platform]
    if (!rules) {
      return {
        is_compliant: true,
        compliance_flags: [],
        violations: [],
        platform_rules: { max_length: 5000, max_daily_messages: 100, tone_requirements: '', hashtag_limit: 0 },
        suggestions: [],
      }
    }

    const flags: ComplianceFlag[] = []
    const violations: string[] = []

    // 1. Check message length
    if (message.length > rules.max_dm_length_first) {
      flags.push({
        type: 'length_violation',
        severity: 'error',
        message: `Message is ${message.length} characters but ${rules.name} allows max ${rules.max_dm_length_first}.`,
        action: 'truncate_or_rewrite',
        detail: `Over by ${message.length - rules.max_dm_length_first} characters`,
      })
      violations.push('length')
    }

    // 2. Check disallowed patterns
    for (const pattern of rules.disallowed_patterns) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(message)) {
        flags.push({
          type: 'disallowed_pattern',
          severity: 'error',
          message: `Message contains disallowed phrase: "${pattern}"`,
          action: 'remove_or_rephrase',
          detail: pattern,
        })
        violations.push('pattern')
        break // Only report first violation to avoid noise
      }
    }

    // 3. Check links
    const linkRegex = /https?:\/\/[^\s]+/gi
    const links = message.match(linkRegex) || []

    if (links.length > 0) {
      const policy = rules.allowed_link_policy
      if (policy === 'no_links_first_message' || policy === 'no_links_in_dm') {
        flags.push({
          type: 'link_policy_violation',
          severity: 'warning',
          message: `Links detected but ${rules.name} policy is "${policy}"`,
          action: 'remove_links_or_review',
          detail: links.join(', '),
        })
      } else if (links.length > 1 && policy === 'one_link_allowed') {
        flags.push({
          type: 'link_policy_violation',
          severity: 'warning',
          message: `Multiple links detected but policy allows only one link`,
          action: 'remove_extra_links',
          detail: `Found ${links.length} links`,
        })
      }
    }

    // 4. Check hashtag limit
    const hashtags = message.match(/#\w+/g) || []
    if (hashtags.length > rules.hashtag_limit && rules.hashtag_limit > 0) {
      flags.push({
        type: 'hashtag_limit',
        severity: 'warning',
        message: `${hashtags.length} hashtags found, ${rules.name} allows max ${rules.hashtag_limit}`,
        action: 'reduce_hashtags',
        detail: `Remove ${hashtags.length - rules.hashtag_limit} hashtag(s)`,
      })
    }

    // 5. Check spam filter triggers
    for (const trigger of rules.spam_filter_triggers) {
      if (this.checkSpamTrigger(message, trigger)) {
        flags.push({
          type: 'spam_trigger',
          severity: 'warning',
          message: `Message may trigger spam filter: "${trigger.replace(/_/g, ' ')}"`,
          action: 'human_review',
          detail: trigger,
        })
      }
    }

    const isCompliant = violations.length === 0
    const suggestions = this.buildSuggestions(flags, rules.max_dm_length_first)

    return {
      is_compliant: isCompliant,
      compliance_flags: flags,
      violations,
      platform_rules: {
        max_length: rules.max_dm_length_first,
        max_daily_messages: rules.max_message_rate_per_account_per_day,
        tone_requirements: rules.tone_requirements,
        hashtag_limit: rules.hashtag_limit,
      },
      suggestions,
    }
  }

  /**
   * Check for specific spam triggers
   */
  private checkSpamTrigger(message: string, trigger: string): boolean {
    switch (trigger) {
      case 'generic_non_personalized_content': {
        const genericPatterns = [
          /^(hi|hello|hey)\s*$/i,
          /dear (sir|madam|friend)/i,
          /to whom it may concern/i,
        ]
        return genericPatterns.some((p) => p.test(message))
      }
      case 'excessive_links': {
        const links = message.match(/https?:\/\/[^\s]+/gi) || []
        return links.length > 2
      }
      case 'poor_grammar':
        return message.includes('  ') || /\s{3,}/.test(message)
      case 'multiple_links_in_post': {
        const postLinks = message.match(/https?:\/\/[^\s]+/gi) || []
        return postLinks.length > 2
      }
      case 'more_than_3_hashtags': {
        const hashtags = message.match(/#\w+/g) || []
        return hashtags.length > 3
      }
      case 'overly_long_captions':
        return message.length > 500
      case 'repetitive_tweets':
      case 'identical_content_to_multiple_users':
        return false // Would need cross-message comparison
      default:
        return false
    }
  }

  /**
   * Build actionable suggestions for each compliance flag
   */
  private buildSuggestions(flags: ComplianceFlag[], maxLength: number) {
    return flags.map((flag) => {
      switch (flag.type) {
        case 'length_violation':
          return {
            issue: 'Message too long',
            fix: `Shorten to ${maxLength} characters. Focus on one value prop and one CTA.`,
            automated: false,
          }
        case 'link_policy_violation':
          return {
            issue: 'Links may be flagged',
            fix: 'Remove links from first message. Add booking link in follow-up after engagement.',
            automated: false,
          }
        case 'disallowed_pattern':
          return {
            issue: `Disallowed phrase: "${flag.detail}"`,
            fix: 'Rephrase to avoid sales-y or spammy language.',
            automated: false,
          }
        case 'hashtag_limit':
          return {
            issue: 'Too many hashtags',
            fix: `Reduce to ${flag.detail?.includes('Remove') ? 'fewer' : 'the allowed number of'} hashtags for this platform.`,
            automated: false,
          }
        case 'spam_trigger':
          return {
            issue: `Potential spam trigger: ${flag.detail?.replace(/_/g, ' ')}`,
            fix: 'Add personalization (name, company reference) or rephrase generic statements.',
            automated: false,
          }
        default:
          return { issue: flag.message, fix: 'Review and revise', automated: false }
      }
    })
  }

  /**
   * Quick check — is message compliant? (returns boolean)
   */
  isCompliant(message: string, platform: SocialPlatform): boolean {
    return this.checkCompliance(message, platform).is_compliant
  }

  /**
   * Get platform daily limit
   */
  getDailyLimit(platform: SocialPlatform): number {
    return PLATFORM_RULES[platform]?.max_message_rate_per_account_per_day ?? 50
  }
}

export const complianceChecker = new PlatformComplianceChecker()
export default complianceChecker
