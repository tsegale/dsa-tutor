export interface StudyStatusDto {
  isParticipant: boolean
  withdrawn: boolean
  consentRequired: boolean
  pretestRequired: boolean
  posttestAvailable: boolean
  posttestCompleted: boolean
  /** Study topics completed under the topic-completion rule, after consent. */
  topicsCompleted: string[]
  /** A researcher opened the post-test without the rule being met. */
  posttestOverride: boolean
  /** The one study topic this participant uses in Classic (the plain
   * visualiser), fixed at enrolment. Null for non-participants. */
  classicTopicSlug: string | null
  /** A throwaway demo account: never a participant, and enrolment refuses
   * it, so the app does not offer it the study. */
  isDemo: boolean
  /** The identifier used in every research export; null for non-participants. */
  participantCode: string | null
  /** When the participant consented (ISO), or null. */
  consentAt: string | null
  /** Whether the end-of-study usability questionnaire (SUS) is in. The score is never sent. */
  susSubmitted: boolean
}
