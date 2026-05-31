/**
 * Platform Compliance Rules
 * Ported from AI DM Software — config/platformRules.json
 * Per-platform message limits, spam triggers, and link policies
 */

export type SocialPlatform = 'email' | 'linkedin' | 'x' | 'facebook' | 'instagram'

export interface PlatformRule {
  name: string
  max_dm_length_first: number
  max_dm_length_followup: number
  max_message_rate_per_account_per_day: number
  min_delay_seconds: number
  max_delay_seconds: number
  disallowed_patterns: string[]
  spam_filter_triggers: string[]
  allowed_link_policy: string
  tone_requirements: string
  hashtag_limit: number
}

export const PLATFORM_RULES: Record<SocialPlatform, PlatformRule> = {
  email: {
    name: 'Email',
    max_dm_length_first: 1500,
    max_dm_length_followup: 1000,
    max_message_rate_per_account_per_day: 200,
    min_delay_seconds: 5,
    max_delay_seconds: 30,
    disallowed_patterns: [
      'unsubscribe from all future emails',
      'click here to buy',
      'limited time offer',
      'act now',
      '100% free',
      'earn money fast',
    ],
    spam_filter_triggers: [
      'generic_non_personalized_content',
      'excessive_links',
      'poor_grammar',
    ],
    allowed_link_policy: 'one_scheduling_link_allowed',
    tone_requirements: 'Professional, value-driven, under 110 words for cold outreach',
    hashtag_limit: 0,
  },

  linkedin: {
    name: 'LinkedIn',
    max_dm_length_first: 200,
    max_dm_length_followup: 300,
    max_message_rate_per_account_per_day: 15,
    min_delay_seconds: 60,
    max_delay_seconds: 180,
    disallowed_patterns: ['hey', 'yo ', 'wanna', 'buy now', 'click here'],
    spam_filter_triggers: [
      'generic_non_personalized_content',
      'poor_grammar',
      'more_than_3_hashtags',
    ],
    allowed_link_policy: 'no_links_first_message',
    tone_requirements: 'Professional, no informal language, value-first approach',
    hashtag_limit: 3,
  },

  x: {
    name: 'X (Twitter)',
    max_dm_length_first: 280,
    max_dm_length_followup: 280,
    max_message_rate_per_account_per_day: 30,
    min_delay_seconds: 40,
    max_delay_seconds: 100,
    disallowed_patterns: ['follow4follow', 'f4f', 'sub4sub'],
    spam_filter_triggers: ['repetitive_tweets', 'identical_content_to_multiple_users'],
    allowed_link_policy: 'one_link_allowed',
    tone_requirements: 'Concise, direct, conversational. Max 280 characters.',
    hashtag_limit: 2,
  },

  facebook: {
    name: 'Facebook / Meta',
    max_dm_length_first: 300,
    max_dm_length_followup: 400,
    max_message_rate_per_account_per_day: 40,
    min_delay_seconds: 45,
    max_delay_seconds: 120,
    disallowed_patterns: ['mlm', 'pyramid scheme', 'guaranteed income', 'click here'],
    spam_filter_triggers: [
      'excessive_links',
      'more_than_3_hashtags',
      'overly_long_captions',
      'generic_non_personalized_content',
    ],
    allowed_link_policy: 'no_links_first_message',
    tone_requirements: 'Casual, conversational, community-focused, warm and approachable',
    hashtag_limit: 3,
  },

  instagram: {
    name: 'Instagram',
    max_dm_length_first: 160,
    max_dm_length_followup: 200,
    max_message_rate_per_account_per_day: 50,
    min_delay_seconds: 30,
    max_delay_seconds: 90,
    disallowed_patterns: ['buy now', 'click here', 'limited time', 'follow me'],
    spam_filter_triggers: [
      'generic_non_personalized_content',
      'multiple_links_in_post',
      'more_than_3_hashtags',
    ],
    allowed_link_policy: 'no_links_in_dm',
    tone_requirements: 'Casual, emoji allowed (max 2), focus on visual content',
    hashtag_limit: 5,
  },
}
