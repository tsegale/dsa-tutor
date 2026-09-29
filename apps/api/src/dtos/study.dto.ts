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
}
