import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/auth-store";
import { useFounderStartup } from "@/lib/pack/useFounderStartup";
import { callAction } from "@/lib/actions/call";
import {
  packScheduleGet,
  packFieldsGet,
  packFieldSet,
  packFieldConfirm,
} from "@/lib/actions/pack-prepare";
import { usePackAuthGate } from "@/lib/pack/usePackAuthGate";
import {
  choosePackScreenState,
  combineQueryStatus,
} from "@/lib/pack/screen-state";
import {
  pinnedScheduleQueryKey,
  sortScheduleFields,
  scheduleMatchesPack,
  friendlyError,
} from "@/lib/pack/pinned-schedule";
import {
  LcsPageShell,
  LcsPageHeader,
  LcsNavItem,
  LcsCard,
  LcsButton,
  LcsStatusPill,
  LcsTextField,
  LcsTextareaField,
  LcsSelectField,
  LcsSkeletonRows,
  LcsEmptyState,
  type LcsStatus,
} from "@/components/lcs";

// Prepare P1 — per-field pack editor. Founder-only, same route-placement
// and auth-gate reasoning as pack.index.tsx (see that file's header).
//
// LOAD-STATE: now via pack-prepare.ts's packFieldsGet, NOT pack.ts's
// packGet. pack_api.pack_get authorizes ONLY on a caller-supplied
// p_org_id matching pack.org_id — packGetDef's own authorize() always
// returns true, deferring entirely to that spoofable-parameter check, and
// never derives the caller's real founder relationship at all (see
// pack_api.pack_fields_get's own header comment in
// supabase/drafts/DRAFT_pack_fields_get.sql for the full citation). Every
// use of pack_get/packGet has been removed from this file. packFieldsGet
// takes only {packId} — no org_id to resolve up front — and is authorized
// entirely by pack_api.pack_fields_get's own
// authz_is_startup_founder(p_uid, v_pack.subject_ref) check against the
// REAL caller uid, derived server-side, never a client-supplied parameter.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ScheduleField = {
  id: string;
  value_type: "text" | "number" | "money" | "date" | "enum" | "structured";
  is_required: boolean;
  sort_order: number;
  section_key: string;
  label: string | null;
  help_text: string | null;
};

type PackFieldRow = {
  id: string;
  pack_id: string;
  schedule_field_id: string;
  value_type: string;
  value_json: unknown;
  currency: string | null;
  warranted_by: string | null;
  warranted_at: string | null;
};

const CURRENCY_OPTIONS = ["USD", "AED", "EUR", "GBP", "INR"] as const;

function fieldState(row: PackFieldRow | undefined): LcsStatus {
  if (!row) return "pending";
  if (row.warranted_at) return "satisfied";
  return "in-progress";
}
function fieldStateLabel(row: PackFieldRow | undefined): string {
  if (!row) return "Not started";
  if (row.warranted_at) return "Confirmed";
  return "Draft";
}

export const Route = createFileRoute("/pack/$packId")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { user, initialized } = useAuthStore.getState();
    if (initialized && !user)
      throw redirect({ to: "/sign-in", search: {}, replace: true });
  },
  component: PackDetailPage,
});

function PackDetailPage() {
  const { packId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const packQueryKey = ["pack-detail", packId];

  // Founder's own startup — used ONLY as this action's scopeId (the
  // record-chain partition key; never an authorization input). Shared
  // with the other /pack screens so zero/multiple-company founders see the
  // same message everywhere.
  const {
    startup,
    status: startupStatus,
    error: startupError,
    message: startupMessage,
  } = useFounderStartup();
  const startupId = startup?.id;

  const {
    data: packData,
    status: packStatus,
    error: packError,
  } = useQuery({
    queryKey: packQueryKey,
    enabled: UUID_RE.test(packId) && !!startupId,
    queryFn: async () => {
      const result = await callAction<{
        ok: true;
        pack: { id: string; org_id: string; schedule_id: string };
        fields: PackFieldRow[];
      }>(packFieldsGet, startupId!, { packId });
      return result;
    },
  });

  const {
    data: scheduleData,
    status: scheduleStatus,
    error: scheduleError,
  } = useQuery({
    // The schedule THIS pack is pinned to (pack_api.pack_schedule_get), not
    // the latest published technology/seed one.
    queryKey: pinnedScheduleQueryKey(packId),
    enabled: UUID_RE.test(packId) && !!startupId,
    queryFn: async () => {
      const result = await callAction<{
        ok: true;
        schedule: { id: string };
        fields: ScheduleField[];
      }>(packScheduleGet, startupId!, { packId });
      return result;
    },
  });

  const fieldsByKey = useMemo(() => {
    const m = new Map<string, PackFieldRow>();
    for (const row of packData?.fields ?? []) m.set(row.schedule_field_id, row);
    return m;
  }, [packData?.fields]);

  const scheduleFields = useMemo(
    () => sortScheduleFields(scheduleData?.fields),
    [scheduleData?.fields],
  );
  // Both responses are for the same pack, so the schedule must be the one
  // the pack is pinned to; a mismatch shows the generic load error.
  const scheduleMismatch = !scheduleMatchesPack(
    packData?.pack,
    scheduleData?.schedule,
  );

  const isPackIdValid = UUID_RE.test(packId);
  const { authInitialized, hasUser } = usePackAuthGate();
  const loadError = startupMessage
    ? null
    : startupError ||
      packError ||
      scheduleError ||
      (scheduleMismatch ? new Error("schedule_mismatch") : null);

  const screenState = choosePackScreenState({
    authInitialized,
    hasUser,
    idValid: isPackIdValid,
    startupStatus,
    startupMessage,
    // A schedule that does not belong to this pack counts as a failed load.
    dataStatus: scheduleMismatch
      ? "error"
      : combineQueryStatus([packStatus, scheduleStatus]),
    isEmpty: scheduleFields.length === 0,
  });

  return (
    <LcsPageShell
      searchPlaceholder="Search"
      userInitials={(user?.fullName ?? user?.email ?? "?")
        .slice(0, 2)
        .toUpperCase()}
      userLabel={user?.fullName ?? user?.email ?? ""}
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div
              className="px-2 py-2 text-[15px] font-semibold"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                color: "var(--lcs-ink)",
              }}
            >
              Lengdon
            </div>
          )}
          <LcsNavItem to="/pack" label="Pack" collapsed={collapsed} icon="P" />
        </nav>
      )}
    >
      <LcsPageHeader
        title="Pack"
        description="Fill in, save, and confirm each field. Confirming warrants the information is accurate."
        action={
          <Link to="/pack/$packId/missing" params={{ packId }}>
            <LcsButton variant="secondary">View missing fields</LcsButton>
          </Link>
        }
      />

      {screenState === "invalid" ? (
        <LcsEmptyState
          title="Could not load this pack"
          text="This pack link isn't valid."
        />
      ) : screenState === "loading" || screenState === "redirect" ? (
        <LcsSkeletonRows rows={6} columns={2} />
      ) : screenState === "startup" ? (
        <LcsEmptyState
          title="Can't open this pack"
          text={startupMessage ?? ""}
        />
      ) : screenState === "error" ? (
        <LcsEmptyState
          title="Could not load this pack"
          text={friendlyError(loadError)}
        />
      ) : screenState === "empty" ? (
        <LcsEmptyState title="No fields" text="This schedule has no fields." />
      ) : (
        <div className="flex flex-col gap-4">
          {scheduleFields.map((field) => (
            <PackFieldCard
              key={field.id}
              field={field}
              row={fieldsByKey.get(field.id)}
              packId={packId}
              scopeId={startupId ?? ""}
              onSaved={() =>
                queryClient.invalidateQueries({ queryKey: packQueryKey })
              }
            />
          ))}
        </div>
      )}
    </LcsPageShell>
  );
}

// Each field card is self-contained: its own local draft state, its own
// save/confirm handlers. Keeps the parent page simple and makes "has
// unsaved changes" a purely local concern per field, matching the
// instruction's "Confirm enabled only when a saved draft exists and the
// form has no unsaved changes" requirement exactly.
function PackFieldCard({
  field,
  row,
  packId,
  scopeId,
  onSaved,
}: {
  field: ScheduleField;
  row: PackFieldRow | undefined;
  packId: string;
  scopeId: string;
  onSaved: () => void;
}) {
  // Local draft value, seeded from the server's last-known value_json.
  // valueText is the editable text/number/json-text representation;
  // moneyAmount/moneyCurrency are the two money-specific pieces.
  const initialValueJson = row?.value_json ?? null;

  const [valueText, setValueText] = useState<string>(() =>
    toEditableText(field.value_type, initialValueJson),
  );
  const [moneyAmount, setMoneyAmount] = useState<string>(() =>
    field.value_type === "money" && isMoneyValue(initialValueJson)
      ? String(initialValueJson.amount)
      : "",
  );
  const [moneyCurrency, setMoneyCurrency] = useState<string>(() =>
    field.value_type === "money" && isMoneyValue(initialValueJson)
      ? initialValueJson.currency
      : "USD",
  );
  const [saving, setSaving] = useState(false);
  // Set true only by an actual "Save draft" click attempted while the
  // money/number value is empty — the inline "Enter an amount."/"Enter a
  // number." message appears on that attempt, not proactively on a
  // freshly-loaded, never-touched empty field (which would be noisy and
  // presumptuous before the user has done anything). Cleared the moment
  // the value stops being empty.
  const [attemptedEmptySave, setAttemptedEmptySave] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Two-step inline warning for editing a Confirmed field (replaces
  // window.confirm per instruction): the first "Save draft" click on a
  // Confirmed field reveals this warning instead of sending anything;
  // nothing is sent until the user explicitly presses "Save and remove
  // confirmation." Reset whenever the underlying row changes (e.g. after
  // a real save elsewhere resets state back to unconfirmed).
  const [showVoidWarning, setShowVoidWarning] = useState(false);
  // "last saved/confirmed" snapshot — what packFieldConfirm's
  // p_expected_value must exactly equal, per instruction. Re-synced from
  // the server on every successful save, never hand-constructed by the
  // client independently of a real server response.
  const [lastKnownValue, setLastKnownValue] = useState<unknown>(
    row?.value_json ?? null,
  );
  // Resync local draft + lastKnownValue whenever the server row changes
  // underneath us (e.g. after invalidation from a save elsewhere).
  useEffect(() => {
    setLastKnownValue(row?.value_json ?? null);
    setValueText(toEditableText(field.value_type, row?.value_json ?? null));
    if (field.value_type === "money" && isMoneyValue(row?.value_json ?? null)) {
      const mv = row!.value_json as { amount: number; currency: string };
      setMoneyAmount(String(mv.amount));
      setMoneyCurrency(mv.currency);
    }
    setShowVoidWarning(false);
    setAttemptedEmptySave(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.value_json, row?.warranted_at]);

  // EMPTY_VALUE: a sentinel distinct from null/undefined/0, meaning
  // "the user has not entered anything for this numeric/money field yet"
  // — never sent to the server, per instruction. An explicit 0 typed by
  // the user is a real, distinct value (Number("0") = 0, which is
  // finite and not this sentinel) and is still allowed through.
  const EMPTY_VALUE = useMemo(() => Symbol("empty"), []);

  // Plain derived value, computed fresh on every render from the current
  // inputs — no side effects (no setState calls) inside this
  // computation, per instruction. jsonParseErrorDerived is read directly
  // by the render below instead of a separate setJsonParseError(null)
  // call living inside what used to be a useMemo.
  const { currentValue, jsonParseErrorDerived } = useMemo<{
    currentValue: unknown;
    jsonParseErrorDerived: string | null;
  }>(() => {
    if (field.value_type === "money") {
      if (moneyAmount.trim() === "") {
        return { currentValue: EMPTY_VALUE, jsonParseErrorDerived: null };
      }
      const amt = Number(moneyAmount);
      if (!Number.isFinite(amt)) {
        return { currentValue: EMPTY_VALUE, jsonParseErrorDerived: null };
      }
      return {
        currentValue: { amount: amt, currency: moneyCurrency },
        jsonParseErrorDerived: null,
      };
    }
    if (field.value_type === "number") {
      if (valueText.trim() === "") {
        return { currentValue: EMPTY_VALUE, jsonParseErrorDerived: null };
      }
      const n = Number(valueText);
      if (!Number.isFinite(n)) {
        return { currentValue: EMPTY_VALUE, jsonParseErrorDerived: null };
      }
      return { currentValue: n, jsonParseErrorDerived: null };
    }
    if (field.value_type === "structured") {
      try {
        const parsed = JSON.parse(valueText === "" ? "null" : valueText);
        return { currentValue: parsed, jsonParseErrorDerived: null };
      } catch {
        return {
          currentValue: undefined, // unparseable, distinct from null
          jsonParseErrorDerived:
            "This isn't valid JSON — check for a missing quote, bracket, or comma.",
        };
      }
    }
    return { currentValue: valueText, jsonParseErrorDerived: null };
  }, [field.value_type, valueText, moneyAmount, moneyCurrency, EMPTY_VALUE]);

  const isEmptyNumericValue = currentValue === EMPTY_VALUE;
  // Clear the "attempted empty save" message the moment the value stops
  // being empty — the user doesn't need to click Save again just to
  // dismiss a message that's already resolved by typing something in.
  useEffect(() => {
    if (!isEmptyNumericValue) setAttemptedEmptySave(false);
  }, [isEmptyNumericValue]);

  // While the void-confirmation warning is open, if the value the user is
  // editing becomes empty (money/number) or invalid (unparseable
  // structured JSON), close the warning automatically — there is nothing
  // valid to save right now, so a warning about what WOULD happen on
  // save is misleading until the value is valid again.
  useEffect(() => {
    if (!showVoidWarning) return;
    if (isEmptyNumericValue) {
      setShowVoidWarning(false);
      return;
    }
    if (field.value_type === "structured" && jsonParseErrorDerived) {
      setShowVoidWarning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmptyNumericValue, jsonParseErrorDerived, field.value_type]);

  const hasUnsavedChanges = useMemo(() => {
    if (isEmptyNumericValue) {
      // Empty with nothing saved yet (lastKnownValue === null) is not a
      // "change" — there was nothing, there is still nothing. Empty with
      // a REAL saved value (lastKnownValue !== null) means the user
      // cleared a previously-saved field — that IS an unsaved change
      // (Confirm must disable; Save draft must show the empty-value
      // message rather than silently treating the clear as a no-op).
      return lastKnownValue !== null;
    }
    try {
      return JSON.stringify(currentValue) !== JSON.stringify(lastKnownValue);
    } catch {
      return true;
    }
  }, [currentValue, lastKnownValue, isEmptyNumericValue]);

  const isConfirmed = !!row?.warranted_at;
  const canConfirm = !!row && !hasUnsavedChanges && !row.warranted_at;
  const alreadyConfirmedUnchanged = !!row?.warranted_at && !hasUnsavedChanges;

  // Click handler for the "Save draft" button. On a Confirmed field, the
  // FIRST click reveals the inline warning + its own two buttons and
  // sends nothing — per instruction, replacing window.confirm() with an
  // inline two-step control. A second click (on "Save and remove
  // confirmation", rendered separately below) is what actually performs
  // the save. On an unconfirmed field, this performs the save directly —
  // there's nothing to warn about.
  const handleSaveClick = () => {
    // jsonParseErrorDerived is the plain derived value computed above
    // (no setState inside the useMemo) — if the current structured-field
    // text doesn't parse, block the save and let the inline helper text
    // (wired to the same derived value, below) explain why. Nothing to
    // set here; the derived value already reflects the current input.
    if (field.value_type === "structured" && jsonParseErrorDerived) {
      return;
    }
    // Money/number: an empty box is "no value," not 0 — send nothing.
    // Reveal the "Enter an amount."/"Enter a number." message only now,
    // on the actual save attempt — not proactively on a freshly-loaded,
    // untouched empty field. An explicit 0 typed by the user is a real
    // value (currentValue !== EMPTY_VALUE in that case) and is not
    // blocked.
    if (isEmptyNumericValue) {
      setAttemptedEmptySave(true);
      return;
    }
    if (isConfirmed) {
      setShowVoidWarning(true);
      return;
    }
    void performSave();
  };

  const performSave = async () => {
    // Guard at the very top — the Symbol sentinel or an unparseable
    // structured value must NEVER reach callAction, regardless of which
    // path called performSave (the direct click on an unconfirmed field,
    // or "Save and remove confirmation" from the void-warning panel).
    // Both cases close the void warning (nothing is being sent either
    // way) and, for the empty-numeric case specifically, reveal the
    // inline message the same way handleSaveClick's own guard does.
    if (currentValue === EMPTY_VALUE) {
      setAttemptedEmptySave(true);
      setShowVoidWarning(false);
      return;
    }
    if (field.value_type === "structured" && jsonParseErrorDerived) {
      setShowVoidWarning(false);
      return;
    }
    setShowVoidWarning(false);
    setSaving(true);
    try {
      const result = await callAction<{
        ok: true;
        field: PackFieldRow;
        warranty_voided: boolean;
        unchanged: boolean;
      }>(packFieldSet, scopeId, {
        packId,
        fieldKey: field.id,
        value: currentValue,
      });
      setLastKnownValue(result.field.value_json);
      if (result.unchanged) {
        // Handled quietly per instruction — no toast noise for a true
        // no-op resubmission.
      } else if (result.warranty_voided) {
        toast("Saved as a draft — confirmation removed.", {
          description: "Confirm again when you're ready.",
        });
      } else {
        toast.success("Draft saved.");
      }
      onSaved();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!row) return;
    setConfirming(true);
    try {
      const result = await callAction<{
        ok: true;
        field: PackFieldRow;
        already_confirmed: boolean;
      }>(packFieldConfirm, scopeId, {
        packId,
        fieldKey: field.id,
        // EXACTLY the value last saved/returned, per instruction — never
        // a value reconstructed from the current form state.
        expectedValue: lastKnownValue,
      });
      if (!result.already_confirmed) {
        toast.success("Confirmed.");
      }
      // already_confirmed handled quietly, per instruction.
      onSaved();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <LcsCard title={field.label ?? field.id}>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {field.help_text && (
            <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
              {field.help_text}
            </div>
          )}
          <LcsStatusPill
            status={fieldState(row)}
            label={fieldStateLabel(row)}
          />
        </div>

        <FieldInput
          field={field}
          valueText={valueText}
          setValueText={setValueText}
          moneyAmount={moneyAmount}
          setMoneyAmount={setMoneyAmount}
          moneyCurrency={moneyCurrency}
          setMoneyCurrency={setMoneyCurrency}
          jsonParseError={jsonParseErrorDerived}
          emptyNumericMessage={
            attemptedEmptySave && isEmptyNumericValue
              ? field.value_type === "money"
                ? "Enter an amount."
                : "Enter a number."
              : null
          }
        />

        {showVoidWarning && (
          // Inline two-step control, replacing window.confirm() per
          // instruction: revealed by the first "Save draft" click on a
          // Confirmed field; nothing is sent until "Save and remove
          // confirmation" below is pressed.
          <div
            className="flex flex-col gap-2 p-3 text-sm"
            style={{
              background: "var(--lcs-attention-wash)",
              border: "1px solid var(--lcs-attention)",
              color: "var(--lcs-ink)",
            }}
          >
            <div>
              Changing a confirmed value removes its confirmation. You will need
              to confirm it again.
            </div>
            <div className="flex items-center gap-2">
              <LcsButton
                variant="secondary"
                disabled={saving}
                onClick={() => setShowVoidWarning(false)}
              >
                Cancel
              </LcsButton>
              <LcsButton
                variant="primary"
                disabled={saving}
                onClick={() => void performSave()}
              >
                {saving ? "Saving…" : "Save and remove confirmation"}
              </LcsButton>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <LcsButton
            variant="secondary"
            disabled={saving || showVoidWarning}
            onClick={handleSaveClick}
          >
            {saving ? "Saving…" : "Save draft"}
          </LcsButton>
          <LcsButton
            variant="primary"
            disabled={!canConfirm || confirming}
            onClick={handleConfirm}
          >
            {confirming
              ? "Confirming…"
              : alreadyConfirmedUnchanged
                ? "Confirmed"
                : "Confirm"}
          </LcsButton>
        </div>
        {!alreadyConfirmedUnchanged && (
          <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
            By confirming, you warrant this information is accurate.
            {/* TODO: placeholder wording — counsel review required before launch. */}
          </div>
        )}
      </div>
    </LcsCard>
  );
}

function FieldInput({
  field,
  valueText,
  setValueText,
  moneyAmount,
  setMoneyAmount,
  moneyCurrency,
  setMoneyCurrency,
  jsonParseError,
  emptyNumericMessage,
}: {
  field: ScheduleField;
  valueText: string;
  setValueText: (v: string) => void;
  moneyAmount: string;
  setMoneyAmount: (v: string) => void;
  moneyCurrency: string;
  setMoneyCurrency: (v: string) => void;
  jsonParseError: string | null;
  emptyNumericMessage: string | null;
}) {
  switch (field.value_type) {
    case "money":
      return (
        <div className="flex gap-3">
          <LcsTextField
            label="Amount"
            type="number"
            value={moneyAmount}
            onChange={(e) => setMoneyAmount(e.target.value)}
            error={!!emptyNumericMessage}
            helper={emptyNumericMessage ?? undefined}
          />
          <LcsSelectField
            label="Currency"
            value={moneyCurrency}
            onChange={(e) => setMoneyCurrency(e.target.value)}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </LcsSelectField>
        </div>
      );
    case "number":
      return (
        <LcsTextField
          label="Value"
          type="number"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          error={!!emptyNumericMessage}
          helper={emptyNumericMessage ?? undefined}
        />
      );
    case "structured":
      return (
        <LcsTextareaField
          label="Value (JSON)"
          rows={5}
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          error={!!jsonParseError}
          helper={jsonParseError ?? undefined}
        />
      );
    case "date":
      return (
        <LcsTextField
          label="Date"
          placeholder="YYYY-MM-DD"
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
        />
      );
    default:
      return (
        <LcsTextareaField
          label="Value"
          rows={3}
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
        />
      );
  }
}

function isMoneyValue(v: unknown): v is { amount: number; currency: string } {
  return (
    !!v &&
    typeof v === "object" &&
    "amount" in (v as object) &&
    "currency" in (v as object)
  );
}

function toEditableText(valueType: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (valueType === "structured") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  if (valueType === "money") return ""; // handled separately via moneyAmount/moneyCurrency
  if (typeof value === "string") return value;
  return String(value);
}
