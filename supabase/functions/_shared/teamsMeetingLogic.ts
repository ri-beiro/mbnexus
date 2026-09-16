// Deno-runtime mirror of src/features/integrations/teamsMeetingLogic.ts —
// same note as _shared/automationConditions.ts: Edge Functions can't import
// the Vite/Node frontend source directly, so keep these two in sync by hand.

export interface MeetingSourceEvent {
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface OnlineMeetingRequest {
  subject: string;
  startDateTime: string;
  endDateTime: string;
}

export function buildOnlineMeetingRequest(event: MeetingSourceEvent): OnlineMeetingRequest {
  return {
    subject: event.title,
    startDateTime: event.startsAt,
    endDateTime: event.endsAt,
  };
}

export interface OnlineMeetingResponse {
  id?: string;
  joinWebUrl?: string;
  joinUrl?: string;
}

export interface EventTeamsPatch {
  teamsMeetingId: string;
  teamsJoinUrl: string;
}

export function mapMeetingResponse(response: OnlineMeetingResponse): EventTeamsPatch {
  if (!response.id) throw new Error("Resposta do Microsoft Graph sem id da reunião.");

  const joinUrl = response.joinWebUrl ?? response.joinUrl;
  if (!joinUrl) throw new Error("Resposta do Microsoft Graph sem link de entrada da reunião.");

  return { teamsMeetingId: response.id, teamsJoinUrl: joinUrl };
}
