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
}
