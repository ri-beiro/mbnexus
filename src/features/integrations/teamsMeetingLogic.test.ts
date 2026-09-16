import { describe, expect, it } from "vitest";
import { buildOnlineMeetingRequest, mapMeetingResponse } from "@/features/integrations/teamsMeetingLogic";

describe("buildOnlineMeetingRequest", () => {
  it("maps an event into a Graph onlineMeeting request body", () => {
    const request = buildOnlineMeetingRequest({
      title: "Planejamento sprint",
      startsAt: "2026-09-20T13:00:00.000Z",
      endsAt: "2026-09-20T14:00:00.000Z",
    });

    expect(request).toEqual({
      subject: "Planejamento sprint",
      startDateTime: "2026-09-20T13:00:00.000Z",
      endDateTime: "2026-09-20T14:00:00.000Z",
    });
  });
});

describe("mapMeetingResponse", () => {
  it("extracts the meeting id and join URL from a Graph onlineMeeting response", () => {
    const patch = mapMeetingResponse({
      id: "meeting-123",
      joinWebUrl: "https://teams.microsoft.com/l/meetup-join/abc",
    });

    expect(patch).toEqual({
      teamsMeetingId: "meeting-123",
      teamsJoinUrl: "https://teams.microsoft.com/l/meetup-join/abc",
    });
  });

  it("falls back to the legacy joinUrl field when joinWebUrl is absent", () => {
    const patch = mapMeetingResponse({
      id: "meeting-123",
      joinUrl: "https://teams.microsoft.com/l/meetup-join/legacy",
    });

    expect(patch.teamsJoinUrl).toBe("https://teams.microsoft.com/l/meetup-join/legacy");
  });

  it("throws when the response has no id", () => {
    expect(() => mapMeetingResponse({ joinWebUrl: "https://teams.microsoft.com/x" })).toThrow();
  });

  it("throws when the response has neither join URL field", () => {
    expect(() => mapMeetingResponse({ id: "meeting-123" })).toThrow();
  });
});
