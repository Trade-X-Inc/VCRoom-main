export type FounderRole = "admin" | "manager" | "analyst" | "viewer";
export type InvestorRole = "admin" | "associate" | "analyst" | "external";
export type AccountType = "founder" | "investor";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
  viewer: "Viewer",
  associate: "Associate",
  external: "External Analyst",
  owner: "Owner",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full platform access. Can manage team members and appoint other admins.",
  manager: "Can manage deal rooms, documents, and pipeline. Cannot manage team.",
  analyst: "Can review and upload documents in assigned deal rooms. Cannot edit profile or pipeline.",
  viewer: "Read-only access to assigned deal rooms. Cannot upload or edit anything.",
  associate: "Can browse startups, request access, and manage assigned deal rooms. Cannot submit final decisions.",
  external: "Limited to assigned deal rooms only. Designed for third-party DD firms and agencies.",
};

export const FOUNDER_ROLES: { value: FounderRole; label: string; description: string }[] = [
  { value: "admin",   label: "Admin — Full access",       description: ROLE_DESCRIPTIONS.admin },
  { value: "manager", label: "Manager — Operations",       description: ROLE_DESCRIPTIONS.manager },
  { value: "analyst", label: "Analyst — Documents & DD",   description: ROLE_DESCRIPTIONS.analyst },
  { value: "viewer",  label: "Viewer — Read only",         description: ROLE_DESCRIPTIONS.viewer },
];

export const INVESTOR_ROLES: { value: InvestorRole; label: string; description: string }[] = [
  { value: "admin",    label: "Admin — Full access",        description: ROLE_DESCRIPTIONS.admin },
  { value: "associate",label: "Associate — Deal flow",      description: ROLE_DESCRIPTIONS.associate },
  { value: "analyst",  label: "Analyst — Documents only",   description: ROLE_DESCRIPTIONS.analyst },
  { value: "external", label: "External — Deal rooms only", description: ROLE_DESCRIPTIONS.external },
];

export const FOUNDER_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: {
    edit_profile: true,
    manage_team: true,
    appoint_admin: true,
    create_deal_room: true,
    view_all_deal_rooms: true,
    upload_documents: true,
    edit_pipeline: true,
    view_analytics: true,
    use_ai_advisor: true,
  },
  admin: {
    edit_profile: true,
    manage_team: true,
    appoint_admin: true,
    create_deal_room: true,
    view_all_deal_rooms: true,
    upload_documents: true,
    edit_pipeline: true,
    view_analytics: true,
    use_ai_advisor: true,
  },
  manager: {
    edit_profile: true,
    manage_team: false,
    appoint_admin: false,
    create_deal_room: true,
    view_all_deal_rooms: true,
    upload_documents: true,
    edit_pipeline: true,
    view_analytics: true,
    use_ai_advisor: true,
  },
  analyst: {
    edit_profile: false,
    manage_team: false,
    appoint_admin: false,
    create_deal_room: false,
    view_all_deal_rooms: false,
    upload_documents: true,
    edit_pipeline: false,
    view_analytics: false,
    use_ai_advisor: true,
  },
  viewer: {
    edit_profile: false,
    manage_team: false,
    appoint_admin: false,
    create_deal_room: false,
    view_all_deal_rooms: false,
    upload_documents: false,
    edit_pipeline: false,
    view_analytics: false,
    use_ai_advisor: false,
  },
};

export const PERMISSION_LABELS: Record<string, string> = {
  edit_profile: "Edit company profile",
  manage_team: "Manage team members",
  appoint_admin: "Appoint other admins",
  create_deal_room: "Create deal rooms",
  view_all_deal_rooms: "View all deal rooms",
  upload_documents: "Upload documents",
  edit_pipeline: "Edit investor pipeline",
  view_analytics: "View profile analytics",
  use_ai_advisor: "Use AI Advisor",
  view_discovery: "Browse startup discovery",
  request_access: "Request founder access",
  submit_decisions: "Submit Invest/Hold/Pass",
  run_ai_analysis: "Run AI document analysis",
  view_settings: "View account settings",
  approve_profile_changes: "Approve fund profile changes",
};

export const INVESTOR_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner: {
    view_discovery: true,
    request_access: true,
    submit_decisions: true,
    manage_team: true,
    appoint_admin: true,
    view_all_deal_rooms: true,
    run_ai_analysis: true,
    view_settings: true,
    edit_profile: true,
    approve_profile_changes: true,
  },
  admin: {
    view_discovery: true,
    request_access: true,
    submit_decisions: true,
    manage_team: true,
    appoint_admin: true,
    view_all_deal_rooms: true,
    run_ai_analysis: true,
    view_settings: true,
    edit_profile: true,
    approve_profile_changes: true,
  },
  associate: {
    view_discovery: true,
    request_access: true,
    submit_decisions: false,
    manage_team: false,
    appoint_admin: false,
    view_all_deal_rooms: true,
    run_ai_analysis: true,
    view_settings: false,
    // Associate edits are staged as pending changes requiring Owner/Admin
    // approval before going live — see investor_profile_pending_changes.
    // edit_profile: true means "can propose an edit," not "edits apply
    // immediately." PermissionGate/RLS treat both roles' edit_profile the
    // same at the gate level; the approval branching happens in the save
    // handler itself (R12C).
    edit_profile: true,
    approve_profile_changes: false,
  },
  analyst: {
    view_discovery: true,
    request_access: false,
    submit_decisions: false,
    manage_team: false,
    appoint_admin: false,
    view_all_deal_rooms: false,
    run_ai_analysis: true,
    view_settings: false,
    edit_profile: false,
    approve_profile_changes: false,
  },
  external: {
    view_discovery: false,
    request_access: false,
    submit_decisions: false,
    manage_team: false,
    appoint_admin: false,
    view_all_deal_rooms: false,
    run_ai_analysis: true,
    view_settings: false,
    edit_profile: false,
    approve_profile_changes: false,
  },
};
