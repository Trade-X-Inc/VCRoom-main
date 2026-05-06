import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { d as useI18n, u as useAuth, c as useQueryClient, s as supabase, y as logActivity, z as createNotification, A as Route, a as useNavigate, L as Link } from "./router-DUHyCcO4.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { p as postJson } from "./backend-CMfy16B4.js";
import { U as User } from "./user-BVMtp3jl.js";
import { S as Sparkles } from "./sparkles-D86DPdwE.js";
import { L as LoaderCircle } from "./loader-circle-BfzWBVMa.js";
import { S as Send } from "./send-DA-wluQh.js";
import { c as cn } from "./utils-Bz4m9VPB.js";
import { U as Users } from "./users-DG4-LCT1.js";
import { c as createLucideIcon } from "./createLucideIcon-ByQ9CEis.js";
import { P as Plus } from "./plus-B_EMNwAw.js";
import { F as Funnel } from "./funnel-BeTrpFwG.js";
import { T as TriangleAlert } from "./triangle-alert-11Lnv70t.js";
import { C as Circle } from "./circle-B2wPxkrm.js";
import { C as Clock } from "./clock-Bv0RxpY4.js";
import { C as CircleCheck } from "./circle-check-O5LqB_cu.js";
import { C as CircleX, E as Eye, D as Dropzone } from "./Dropzone-B6seOivR.js";
import { C as ChevronRight } from "./chevron-right-DmvFmFFf.js";
import { D as Download } from "./download-DanhJleR.js";
import { L as LogOut } from "./log-out-FTe-LCSl.js";
import { S as Search } from "./search-BdeIBPuN.js";
import { A as ArrowRight } from "./arrow-right-UEn806qT.js";
import { F as FileText } from "./file-text-D5pqWYYG.js";
import { L as LayoutGrid } from "./layout-grid-jsBmracF.js";
import { M as MessageSquare } from "./message-square-BXZGe1sQ.js";
import { L as ListChecks } from "./list-checks-BhQJes8X.js";
import { A as Activity } from "./activity-09U6LVNQ.js";
import { C as Calendar } from "./calendar-BqAUqDh3.js";
import { L as Lock } from "./lock-eF84C8lO.js";
import { X } from "./x-DEg4i2kq.js";
import { C as CircleQuestionMark } from "./circle-question-mark-CCA2xeUH.js";
import { T as TrendingUp } from "./trending-up-DgeIFwuL.js";
import { S as Shield } from "./shield-QHmdsR0s.js";
import { B as Building2 } from "./building-2-e7mFjcBM.js";
import { C as CircleAlert } from "./circle-alert-DloSsagr.js";
import { U as UserPlus } from "./user-plus-SO3V9bS7.js";
import { t as toDate, g as getDefaultOptions, c as constructFrom, n as normalizeDates, a as getTimezoneOffsetInMilliseconds, m as millisecondsInDay, b as millisecondsInWeek, e as enUS, f as formatDistanceToNow } from "./formatDistanceToNow-DZsPIRrC.js";
import { E as ExternalLink } from "./external-link-BW-tV4s8.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./upload-CeiGIE-p.js";
function startOfWeek(date, options) {
  const defaultOptions = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions.weekStartsOn ?? defaultOptions.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}
function getISOWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom(date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}
function startOfYear(date, options) {
  const date_ = toDate(date, options?.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}
function getDayOfYear(date, options) {
  const _date = toDate(date, options?.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}
function getISOWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}
function getWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const defaultOptions = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
  const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}
function startOfWeekYear(date, options) {
  const defaultOptions = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom(options?.in || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}
function getWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}
const lightFormatters = {
  // Year
  y(date, token) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  // Month
  M(date, token) {
    const month = date.getMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d(date, token) {
    return addLeadingZeros(date.getDate(), token.length);
  },
  // AM or PM
  a(date, token) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h(date, token) {
    return addLeadingZeros(date.getHours() % 12 || 12, token.length);
  },
  // Hour [0-23]
  H(date, token) {
    return addLeadingZeros(date.getHours(), token.length);
  },
  // Minute
  m(date, token) {
    return addLeadingZeros(date.getMinutes(), token.length);
  },
  // Second
  s(date, token) {
    return addLeadingZeros(date.getSeconds(), token.length);
  },
  // Fraction of second
  S(date, token) {
    const numberOfDigits = token.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(
      milliseconds * Math.pow(10, numberOfDigits - 3)
    );
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};
const dayPeriodEnum = {
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
const formatters = {
  // Era
  G: function(date, token, localize) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token) {
      // AD, BC
      case "G":
      case "GG":
      case "GGG":
        return localize.era(era, { width: "abbreviated" });
      // A, B
      case "GGGGG":
        return localize.era(era, { width: "narrow" });
      // Anno Domini, Before Christ
      case "GGGG":
      default:
        return localize.era(era, { width: "wide" });
    }
  },
  // Year
  y: function(date, token, localize) {
    if (token === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token);
  },
  // Local week-numbering year
  Y: function(date, token, localize, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  // ISO week-numbering year
  R: function(date, token) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: function(date, token) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token.length);
  },
  // Quarter
  Q: function(date, token, localize) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "Q":
        return String(quarter);
      // 01, 02, 03, 04
      case "QQ":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "Qo":
        return localize.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "QQQ":
        return localize.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "QQQQQ":
        return localize.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      // 1st quarter, 2nd quarter, ...
      case "QQQQ":
      default:
        return localize.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone quarter
  q: function(date, token, localize) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      // 1, 2, 3, 4
      case "q":
        return String(quarter);
      // 01, 02, 03, 04
      case "qq":
        return addLeadingZeros(quarter, 2);
      // 1st, 2nd, 3rd, 4th
      case "qo":
        return localize.ordinalNumber(quarter, { unit: "quarter" });
      // Q1, Q2, Q3, Q4
      case "qqq":
        return localize.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      // 1, 2, 3, 4 (narrow quarter; could be not numerical)
      case "qqqqq":
        return localize.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      // 1st quarter, 2nd quarter, ...
      case "qqqq":
      default:
        return localize.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Month
  M: function(date, token, localize) {
    const month = date.getMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token);
      // 1st, 2nd, ..., 12th
      case "Mo":
        return localize.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "MMM":
        return localize.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      // J, F, ..., D
      case "MMMMM":
        return localize.month(month, {
          width: "narrow",
          context: "formatting"
        });
      // January, February, ..., December
      case "MMMM":
      default:
        return localize.month(month, { width: "wide", context: "formatting" });
    }
  },
  // Stand-alone month
  L: function(date, token, localize) {
    const month = date.getMonth();
    switch (token) {
      // 1, 2, ..., 12
      case "L":
        return String(month + 1);
      // 01, 02, ..., 12
      case "LL":
        return addLeadingZeros(month + 1, 2);
      // 1st, 2nd, ..., 12th
      case "Lo":
        return localize.ordinalNumber(month + 1, { unit: "month" });
      // Jan, Feb, ..., Dec
      case "LLL":
        return localize.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      // J, F, ..., D
      case "LLLLL":
        return localize.month(month, {
          width: "narrow",
          context: "standalone"
        });
      // January, February, ..., December
      case "LLLL":
      default:
        return localize.month(month, { width: "wide", context: "standalone" });
    }
  },
  // Local week of year
  w: function(date, token, localize, options) {
    const week = getWeek(date, options);
    if (token === "wo") {
      return localize.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token.length);
  },
  // ISO week of year
  I: function(date, token, localize) {
    const isoWeek = getISOWeek(date);
    if (token === "Io") {
      return localize.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  // Day of the month
  d: function(date, token, localize) {
    if (token === "do") {
      return localize.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token);
  },
  // Day of year
  D: function(date, token, localize) {
    const dayOfYear = getDayOfYear(date);
    if (token === "Do") {
      return localize.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  // Day of week
  E: function(date, token, localize) {
    const dayOfWeek = date.getDay();
    switch (token) {
      // Tue
      case "E":
      case "EE":
      case "EEE":
        return localize.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "EEEEE":
        return localize.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "EEEEEE":
        return localize.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "EEEE":
      default:
        return localize.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Local day of week
  e: function(date, token, localize, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (Nth day of week with current locale or weekStartsOn)
      case "e":
        return String(localDayOfWeek);
      // Padded numerical value
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      // 1st, 2nd, ..., 7th
      case "eo":
        return localize.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "eeeee":
        return localize.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "eeeeee":
        return localize.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "eeee":
      default:
        return localize.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone local day of week
  c: function(date, token, localize, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      // Numerical value (same as in `e`)
      case "c":
        return String(localDayOfWeek);
      // Padded numerical value
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      // 1st, 2nd, ..., 7th
      case "co":
        return localize.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      // T
      case "ccccc":
        return localize.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      // Tu
      case "cccccc":
        return localize.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      // Tuesday
      case "cccc":
      default:
        return localize.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // ISO day of week
  i: function(date, token, localize) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      // 2
      case "i":
        return String(isoDayOfWeek);
      // 02
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      // 2nd
      case "io":
        return localize.ordinalNumber(isoDayOfWeek, { unit: "day" });
      // Tue
      case "iii":
        return localize.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      // T
      case "iiiii":
        return localize.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      // Tu
      case "iiiiii":
        return localize.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      // Tuesday
      case "iiii":
      default:
        return localize.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM or PM
  a: function(date, token, localize) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM, PM, midnight, noon
  b: function(date, token, localize) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // in the morning, in the afternoon, in the evening, at night
  B: function(date, token, localize) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Hour [1-12]
  h: function(date, token, localize) {
    if (token === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0) hours = 12;
      return localize.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token);
  },
  // Hour [0-23]
  H: function(date, token, localize) {
    if (token === "Ho") {
      return localize.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token);
  },
  // Hour [0-11]
  K: function(date, token, localize) {
    const hours = date.getHours() % 12;
    if (token === "Ko") {
      return localize.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Hour [1-24]
  k: function(date, token, localize) {
    let hours = date.getHours();
    if (hours === 0) hours = 24;
    if (token === "ko") {
      return localize.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Minute
  m: function(date, token, localize) {
    if (token === "mo") {
      return localize.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token);
  },
  // Second
  s: function(date, token, localize) {
    if (token === "so") {
      return localize.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token);
  },
  // Fraction of second
  S: function(date, token) {
    return lightFormatters.S(date, token);
  },
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      // Hours and optional minutes
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XX`
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `XXX`
      case "XXXXX":
      case "XXX":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Hours and optional minutes
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      // Hours, minutes and optional seconds without `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xx`
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      // Hours, minutes and optional seconds with `:` delimiter
      // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
      // so this token always has the same output as `xxx`
      case "xxxxx":
      case "xxx":
      // Hours and minutes with `:` delimiter
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (GMT)
  O: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Short
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (specific non-location)
  z: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      // Short
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      // Long
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Seconds timestamp
  t: function(date, token, _localize) {
    const timestamp = Math.trunc(+date / 1e3);
    return addLeadingZeros(timestamp, token.length);
  },
  // Milliseconds timestamp
  T: function(date, token, _localize) {
    return addLeadingZeros(+date, token.length);
  }
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}
const dateLongFormatter = (pattern, formatLong) => {
  switch (pattern) {
    case "P":
      return formatLong.date({ width: "short" });
    case "PP":
      return formatLong.date({ width: "medium" });
    case "PPP":
      return formatLong.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong.date({ width: "full" });
  }
};
const timeLongFormatter = (pattern, formatLong) => {
  switch (pattern) {
    case "p":
      return formatLong.time({ width: "short" });
    case "pp":
      return formatLong.time({ width: "medium" });
    case "ppp":
      return formatLong.time({ width: "long" });
    case "pppp":
    default:
      return formatLong.time({ width: "full" });
  }
};
const dateTimeLongFormatter = (pattern, formatLong) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong)).replace("{{time}}", timeLongFormatter(timePattern, formatLong));
};
const longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};
const dayOfYearTokenRE = /^D+$/;
const weekYearTokenRE = /^Y+$/;
const throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return dayOfYearTokenRE.test(token);
}
function isProtectedWeekYearToken(token) {
  return weekYearTokenRE.test(token);
}
function warnOrThrowProtectedError(token, format2, input) {
  const _message = message(token, format2, input);
  console.warn(_message);
  if (throwTokens.includes(token)) throw new RangeError(_message);
}
function message(token, format2, input) {
  const subject = token[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format2}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}
const formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
const longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
const escapedStringRegExp = /^'([^]*?)'?$/;
const doubleQuoteRegExp = /''/g;
const unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  const defaultOptions = getDefaultOptions();
  const locale = defaultOptions.locale ?? enUS;
  const firstWeekContainsDate = defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
  const weekStartsOn = defaultOptions.weekStartsOn ?? defaultOptions.locale?.options?.weekStartsOn ?? 0;
  const originalDate = toDate(date, options?.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError(
        "Format string contains an unescaped latin alphabet character `" + firstCharacter + "`"
      );
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken) return part.value;
    const token = part.value;
    if (isProtectedWeekYearToken(token) || isProtectedDayOfYearToken(token)) {
      warnOrThrowProtectedError(token, formatStr, String(date));
    }
    const formatter = formatters[token[0]];
    return formatter(originalDate, token, locale.localize, formatterOptions);
  }).join("");
}
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}
const __iconNode$g = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$g);
const __iconNode$f = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
const ChevronDown = createLucideIcon("chevron-down", __iconNode$f);
const __iconNode$e = [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }]
];
const DollarSign = createLucideIcon("dollar-sign", __iconNode$e);
const __iconNode$d = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "m9 15 2 2 4-4", key: "1grp1n" }]
];
const FileCheck = createLucideIcon("file-check", __iconNode$d);
const __iconNode$c = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M12 17h.01", key: "p32p05" }],
  ["path", { d: "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3", key: "mhlwft" }]
];
const FileQuestionMark = createLucideIcon("file-question-mark", __iconNode$c);
const __iconNode$b = [
  ["path", { d: "m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381", key: "pgg06f" }],
  ["path", { d: "m16 16 6-6", key: "vzrcl6" }],
  ["path", { d: "m21.5 10.5-8-8", key: "a17d9x" }],
  ["path", { d: "m8 8 6-6", key: "18bi4p" }],
  ["path", { d: "m8.5 7.5 8 8", key: "1oyaui" }]
];
const Gavel = createLucideIcon("gavel", __iconNode$b);
const __iconNode$a = [
  [
    "path",
    {
      d: "M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
      key: "1n2ejm"
    }
  ],
  [
    "path",
    {
      d: "M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",
      key: "1qfcsi"
    }
  ]
];
const MessagesSquare = createLucideIcon("messages-square", __iconNode$a);
const __iconNode$9 = [
  [
    "path",
    {
      d: "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551",
      key: "1miecu"
    }
  ]
];
const Paperclip = createLucideIcon("paperclip", __iconNode$9);
const __iconNode$8 = [
  [
    "path",
    {
      d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
      key: "143wyd"
    }
  ],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6", key: "1itne7" }],
  ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1", key: "1ue0tg" }]
];
const Printer = createLucideIcon("printer", __iconNode$8);
const __iconNode$7 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M8 14s1.5 2 4 2 4-2 4-2", key: "1y1vjs" }],
  ["line", { x1: "9", x2: "9.01", y1: "9", y2: "9", key: "yxxnd0" }],
  ["line", { x1: "15", x2: "15.01", y1: "9", y2: "9", key: "1p4y9e" }]
];
const Smile = createLucideIcon("smile", __iconNode$7);
const __iconNode$6 = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
];
const Star = createLucideIcon("star", __iconNode$6);
const __iconNode$5 = [
  [
    "path",
    {
      d: "M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z",
      key: "1dfntj"
    }
  ],
  ["path", { d: "M15 3v5a1 1 0 0 0 1 1h5", key: "6s6qgf" }]
];
const StickyNote = createLucideIcon("sticky-note", __iconNode$5);
const __iconNode$4 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
];
const Target = createLucideIcon("target", __iconNode$4);
const __iconNode$3 = [
  [
    "path",
    {
      d: "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",
      key: "m61m77"
    }
  ],
  ["path", { d: "M17 14V2", key: "8ymqnk" }]
];
const ThumbsDown = createLucideIcon("thumbs-down", __iconNode$3);
const __iconNode$2 = [
  [
    "path",
    {
      d: "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
      key: "emmmcr"
    }
  ],
  ["path", { d: "M7 10v12", key: "1qc93n" }]
];
const ThumbsUp = createLucideIcon("thumbs-up", __iconNode$2);
const __iconNode$1 = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "11", x2: "11", y1: "8", y2: "14", key: "1vmskp" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
];
const ZoomIn = createLucideIcon("zoom-in", __iconNode$1);
const __iconNode = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65", key: "13gj7c" }],
  ["line", { x1: "8", x2: "14", y1: "11", y2: "11", key: "durymu" }]
];
const ZoomOut = createLucideIcon("zoom-out", __iconNode);
function AIChat({ scope, starters, initialAssistant, className = "", compact = false }) {
  const [msgs, setMsgs] = reactExports.useState(() => [
    {
      id: "m0",
      role: "assistant",
      content: initialAssistant ?? `I'm your AI advisor${scope ? ` for ${scope}` : ""}. Ask me anything about your raise — investors, term sheets, diligence, outreach.`,
      ts: Date.now()
    }
  ]);
  const [input, setInput] = reactExports.useState("");
  const [thinking, setThinking] = reactExports.useState(false);
  const endRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);
  const send = async (text) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    setMsgs((xs) => [...xs, { id: `u${Date.now()}`, role: "user", content: t, ts: Date.now() }]);
    setThinking(true);
    const endpoint = scope?.toLowerCase().includes("deal room") ? "/api/ai/memo" : "/api/ai/summary";
    try {
      const response = await postJson(endpoint, { context: `${scope ?? "workspace"}

User prompt: ${t}` });
      const reply = response.memo || response.summary || "No AI response generated.";
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: reply, ts: Date.now() }]);
    } catch (error) {
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: `AI request failed: ${error instanceof Error ? error.message : "unknown error"}`, ts: Date.now() }]);
    }
    setThinking(false);
  };
  const showStarters = msgs.length <= 1 && starters && starters.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex flex-col h-full bg-background ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-6 space-y-5`, children: [
      msgs.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`, children: m.role === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`, children: m.content })
      ] }, m.id)),
      thinking && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand animate-pulse" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
          " Thinking…"
        ] })
      ] }),
      showStarters && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 gap-2 pt-2", children: starters.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => send(s), className: "text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand mb-1.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: s })
      ] }, s)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 bg-background/80 backdrop-blur-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-3.5`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            send(input);
          },
          className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: input,
                onChange: (e) => setInput(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                },
                rows: 1,
                placeholder: `Ask the AI advisor${scope ? ` about ${scope}` : ""}…`,
                className: "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: !input.trim() || thinking, className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 text-[10px] text-muted-foreground text-center", children: "AI may be inaccurate — verify with your legal & finance team." })
    ] }) })
  ] });
}
const ddChecklist = [
  { id: "dd1", category: "Legal", title: "NDA executed by all parties", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd2", category: "Legal", title: "IP assignment agreements", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd3", category: "Legal", title: "Customer contracts review", owner: "Sam Cole", ownerInitials: "SC", due: "Fri", status: "in_progress" },
  { id: "dd4", category: "Legal", title: "Cap table verification", owner: "Jordan Reeves", ownerInitials: "JR", due: "Done", status: "done" },
  { id: "dd5", category: "Financial", title: "Revenue audit Q1–Q4", owner: "Jordan Reeves", ownerInitials: "JR", due: "Done", status: "done" },
  { id: "dd6", category: "Financial", title: "Cohort retention analysis", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd7", category: "Financial", title: "Forecast model 2026", owner: "Jordan Reeves", ownerInitials: "JR", due: "Mon", status: "in_progress" },
  { id: "dd8", category: "Financial", title: "Unit economics breakdown", owner: "Sam Cole", ownerInitials: "SC", due: "Wed", status: "todo" },
  { id: "dd9", category: "Technical", title: "Architecture review with NEA", owner: "Mei Tan", ownerInitials: "MT", due: "Done", status: "done" },
  { id: "dd10", category: "Technical", title: "Security & SOC2 audit", owner: "Sam Cole", ownerInitials: "SC", due: "Next week", status: "blocked" },
  { id: "dd11", category: "Technical", title: "Code quality review", owner: "Mei Tan", ownerInitials: "MT", due: "Thu", status: "todo" },
  { id: "dd12", category: "Commercial", title: "Customer reference calls (3)", owner: "Sam Cole", ownerInitials: "SC", due: "Fri", status: "in_progress" },
  { id: "dd13", category: "Commercial", title: "Competitive landscape memo", owner: "Jordan Reeves", ownerInitials: "JR", due: "Mon", status: "todo" },
  { id: "dd14", category: "Team", title: "Founder background checks", owner: "External", ownerInitials: "EX", due: "Done", status: "done" },
  { id: "dd15", category: "Team", title: "Key hire pipeline review", owner: "Jordan Reeves", ownerInitials: "JR", due: "Wed", status: "todo" }
];
const dealRoomChat = [
  { id: "m1", author: "Sara Khan", initials: "SK", role: "Investor", text: "Reviewed the cohort doc — impressive net retention. Can we schedule a call with your top 2 customers this week?", time: "9:14 AM" },
  { id: "m2", author: "Jordan Reeves", initials: "JR", role: "Founder", text: "Absolutely. I'll line up Acme and Northstar for Wed/Thu. Sending Calendly invites in 5.", time: "9:18 AM", me: true },
  { id: "m3", author: "Mark Lin", initials: "ML", role: "Investor", text: "Quick one — what's your target gross margin at scale on the hardware side?", time: "9:22 AM" },
  { id: "m4", author: "Mei Tan", initials: "MT", role: "Founder", text: "Targeting 62% by Y3 as we move from contract manufacturing to in-house final assembly. BOM doc is in /Financials.", time: "9:30 AM", me: true },
  { id: "m5", author: "Sara Khan", initials: "SK", role: "Investor", text: "Perfect. Partner meeting Wed 1PM still on?", time: "9:31 AM" }
];
const dealRoomMembers = [
  { name: "Jordan Reeves", initials: "JR", role: "Founder", online: true },
  { name: "Mei Tan", initials: "MT", role: "Founder", online: true },
  { name: "Sara Khan", initials: "SK", role: "Investor", online: true },
  { name: "Mark Lin", initials: "ML", role: "Investor", online: false },
  { name: "Tom Reid", initials: "TR", role: "Investor", online: false }
];
function DealRoomChat() {
  const { t } = useI18n();
  const [messages, setMessages] = reactExports.useState(dealRoomChat);
  const [draft, setDraft] = reactExports.useState("");
  const [typing, setTyping] = reactExports.useState(false);
  const scrollRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((xs) => [...xs, { id: crypto.randomUUID(), author: "Jordan Reeves", initials: "JR", role: "Founder", text, time: now, me: true }]);
    setDraft("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((xs) => [...xs, {
        id: crypto.randomUUID(),
        author: "Sara Khan",
        initials: "SK",
        role: "Investor",
        text: "Got it — let me sync with the partnership and circle back today.",
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      }]);
    }, 1800);
  };
  const onlineCount = dealRoomMembers.filter((m) => m.online).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex -space-x-2", children: dealRoomMembers.slice(0, 4).map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-[10px] font-semibold ring-2 ring-card", children: m.initials }),
        m.online && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-card" })
      ] }, m.name)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Atlas × NEA — Deal Chat" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-muted-foreground inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-3 w-3" }),
          " ",
          dealRoomMembers.length,
          " members · ",
          onlineCount,
          " ",
          t("chat.online")
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-5 py-4 space-y-3", children: [
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped = prev && prev.author === m.author;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex gap-3", m.me ? "flex-row-reverse" : ""), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-8 w-8 shrink-0", grouped && "invisible"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"), children: m.initials }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("max-w-[72%]", m.me && "items-end flex flex-col"), children: [
            !grouped && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex items-center gap-2 mb-1 text-[11px]", m.me && "flex-row-reverse"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: m.author }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn(
                "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                m.role === "Investor" ? "bg-brand/10 text-brand" : m.role === "Founder" ? "bg-success/10 text-success" : "bg-violet/10 text-violet"
              ), children: m.role }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: m.time })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
              "rounded-2xl px-3.5 py-2 text-sm",
              m.me ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"
            ), children: m.text })
          ] })
        ] }, m.id);
      }),
      typing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent text-[10px] font-semibold", children: "SK" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl bg-accent px-4 py-3 inline-flex gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow", style: { animationDelay: "0.15s" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse-glow", style: { animationDelay: "0.3s" } })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-3 border-t border-border/60 bg-background", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paperclip, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          rows: 1,
          value: draft,
          onChange: (e) => setDraft(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          },
          placeholder: t("chat.placeholder"),
          className: "flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground p-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Smile, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: send, disabled: !draft.trim(), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }),
        " ",
        t("chat.send")
      ] })
    ] }) })
  ] });
}
const statusMeta = {
  done: { label: "Done", icon: CircleCheck, tint: "text-success" },
  in_progress: { label: "In progress", icon: Clock, tint: "text-brand" },
  todo: { label: "To do", icon: Circle, tint: "text-muted-foreground" },
  blocked: { label: "Blocked", icon: TriangleAlert, tint: "text-warning" }
};
const cycle = { todo: "in_progress", in_progress: "done", done: "todo", blocked: "todo" };
function DDChecklist() {
  const { t } = useI18n();
  const [items, setItems] = reactExports.useState(ddChecklist);
  const [filter, setFilter] = reactExports.useState("all");
  const filtered = reactExports.useMemo(() => filter === "all" ? items : items.filter((i) => i.status === filter), [items, filter]);
  const byCategory = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    filtered.forEach((i) => {
      if (!m.has(i.category)) m.set(i.category, []);
      m.get(i.category).push(i);
    });
    return Array.from(m.entries());
  }, [filtered]);
  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const overall = Math.round(done / total * 100);
  const cycleStatus = (id) => setItems((xs) => xs.map((x) => x.id === id ? { ...x, status: cycle[x.status] } : x));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: t("checklist.title") }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
          done,
          " of ",
          total,
          " items ",
          t("checklist.complete").toLowerCase(),
          " · ",
          overall,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " ",
        t("checklist.add")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${overall}%` } }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { className: "h-3.5 w-3.5 text-muted-foreground" }),
      ["all", "todo", "in_progress", "done", "blocked"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setFilter(f),
          className: cn(
            "rounded-full px-3 py-1 text-xs transition-colors",
            filter === f ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"
          ),
          children: f === "all" ? "All" : statusMeta[f].label
        },
        f
      ))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 space-y-4", children: byCategory.map(([cat, list]) => {
      const catDone = list.filter((i) => i.status === "done").length;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 py-3 border-b border-border/60 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: cat }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground tabular-nums", children: [
            catDone,
            "/",
            list.length
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "divide-y divide-border/60", children: list.map((i) => {
          const M = statusMeta[i.status];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 items-center px-5 py-3 hover:bg-accent/30 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => cycleStatus(i.id), className: cn("col-span-1", M.tint), title: M.label, children: /* @__PURE__ */ jsxRuntimeExports.jsx(M.icon, { className: "h-5 w-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-6 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-sm font-medium truncate", i.status === "done" && "text-muted-foreground line-through"), children: i.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-[11px] mt-0.5", M.tint), children: M.label })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-3 flex items-center gap-2 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0", children: i.ownerInitials }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground truncate", children: i.owner })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-end text-xs text-muted-foreground tabular-nums", children: i.due })
          ] }, i.id);
        }) })
      ] }, cat);
    }) })
  ] });
}
const DOCS = [
  "Pitch deck v3.pdf",
  "Financial model.xlsx",
  "Cohort analysis v2.pdf",
  "Cap table.xlsx",
  "Customer references.pdf",
  "Architecture overview.pdf"
];
const STAGES = ["Deal Sourced", "Under Review", "Partner Review", "Term Sheet", "Closed"];
const SECTION_META = [
  { key: "pitch", label: "Pitch & Narrative", checks: ["Clear problem statement", "Market size defined", "Unique value proposition", "Compelling story"] },
  { key: "financial", label: "Financial Model", checks: ["Revenue projections", "Unit economics", "Burn rate & runway", "Path to profitability"] },
  { key: "team", label: "Team", checks: ["Founder-market fit", "Technical expertise", "Domain experience", "Advisory network"] },
  { key: "meeting", label: "Meeting Notes", checks: ["Key topics covered", "Action items captured", "Follow-up scheduled", "Red flags noted"] },
  { key: "dd", label: "Due Diligence", checks: ["Legal structure", "IP ownership", "Customer references", "Financials verified"] },
  { key: "qa", label: "Q&A", checks: ["All questions answered", "No unanswered concerns", "Founder responsive", "Satisfactory responses"] }
];
const DECISION_TO_DB = {
  "Under Review": "under_review",
  "Request More Info": "info_requested",
  "Move to Partner Review": "partner_review",
  "Term Sheet Ready": "term_sheet",
  "Not Proceeding": "rejected",
  "Exit": "exited"
};
const DB_TO_DECISION = {
  under_review: "Under Review",
  info_requested: "Request More Info",
  partner_review: "Move to Partner Review",
  term_sheet: "Term Sheet Ready",
  rejected: "Not Proceeding",
  exited: "Exit"
};
function decisionTone(status) {
  if (status === "Term Sheet Ready") return "success";
  if (status === "Move to Partner Review") return "violet";
  if (status === "Request More Info") return "warning";
  if (status === "Not Proceeding" || status === "Exit") return "destructive";
  return "brand";
}
function initSections(metadata) {
  const empty = () => ({ status: "Not reviewed", rating: 0, notes: "", checks: {} });
  return {
    pitch: metadata?.["pitch_review"] ?? empty(),
    financial: metadata?.["financial_review"] ?? empty(),
    team: metadata?.["team_review"] ?? empty(),
    meeting: metadata?.["meeting_review"] ?? empty(),
    dd: metadata?.["dd_review"] ?? empty(),
    qa: metadata?.["qa_review"] ?? empty()
  };
}
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function useLatestDecision(dealRoomId) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["decision", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("decisions").select("id, status, notes, metadata, created_at").eq("deal_room_id", dealRoomId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    }
  });
}
function ReviewTab({
  dealRoomId,
  currentUserRole,
  startupId
}) {
  return currentUserRole === "investor" ? /* @__PURE__ */ jsxRuntimeExports.jsx(InvestorReview, { dealRoomId, startupId }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FounderReview, { dealRoomId });
}
function InvestorReview({ dealRoomId, startupId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: decision } = useLatestDecision(dealRoomId);
  const [sections, setSections] = reactExports.useState(initSections(null));
  const [activeDoc, setActiveDoc] = reactExports.useState(DOCS[0]);
  const [docNotes, setDocNotes] = reactExports.useState({});
  const [reviewedDocs, setReviewedDocs] = reactExports.useState({});
  const prevIdRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    if (decision === void 0) return;
    const newId = decision?.id ?? null;
    if (newId !== prevIdRef.current) {
      prevIdRef.current = newId;
      setSections(initSections(decision?.metadata));
    }
  }, [decision]);
  const completed = Object.values(sections).filter((s) => s.status === "Done").length;
  const ratings = Object.values(sections).map((s) => s.rating).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const handleChange = (key, updated) => {
    setSections((prev) => ({ ...prev, [key]: updated }));
  };
  const handleSave = async (key, updated) => {
    const newSections = { ...sections, [key]: updated };
    setSections(newSections);
    const metaPayload = {};
    for (const k of Object.keys(newSections)) {
      metaPayload[`${k}_review`] = newSections[k];
    }
    if (decision?.id) {
      await supabase.from("decisions").update({ metadata: metaPayload }).eq("id", decision.id);
    } else {
      await supabase.from("decisions").insert({
        deal_room_id: dealRoomId,
        decided_by: user.id,
        status: "under_review",
        metadata: metaPayload
      });
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };
  const handleDecision = async (type, extra) => {
    if (!user?.id) return;
    const metaPayload = {};
    for (const k of Object.keys(sections)) {
      metaPayload[`${k}_review`] = sections[k];
    }
    if (extra?.requestInfo) metaPayload["request_info"] = extra.requestInfo;
    if (extra?.reason) metaPayload["reason"] = extra.reason;
    await supabase.from("decisions").insert({
      deal_room_id: dealRoomId,
      decided_by: user.id,
      status: DECISION_TO_DB[type],
      notes: extra?.message ?? null,
      metadata: metaPayload
    });
    await logActivity(dealRoomId, user.id, `Decision: ${type}`);
    if (startupId) {
      const { data: startup } = await supabase.from("startups").select("founder_id").eq("id", startupId).maybeSingle();
      if (startup?.founder_id) {
        await createNotification(
          startup.founder_id,
          `Deal update: ${type}`,
          extra?.message ?? `An investor updated your deal status to "${type}".`,
          "decision",
          dealRoomId,
          `/app/deal-room/${dealRoomId}`
        );
      }
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };
  const currentDecisionStatus = decision?.status ? DB_TO_DECISION[decision.status] : void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 p-6 lg:p-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Investment Review" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Complete each section before making a final decision." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground mb-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              completed,
              " of 6 sections reviewed"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              Math.round(completed / 6 * 100),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand transition-all", style: { width: `${completed / 6 * 100}%` } }) })
        ] })
      ] }),
      SECTION_META.map((meta) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        ReviewSection,
        {
          meta,
          state: sections[meta.key],
          onChange: (updated) => handleChange(meta.key, updated),
          onSave: (updated) => handleSave(meta.key, updated)
        },
        meta.key
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionZone, { avg, currentStatus: currentDecisionStatus, onDecision: handleDecision })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:sticky lg:top-4 self-start", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DocumentPreview,
      {
        activeDoc,
        setActiveDoc,
        docNotes,
        setDocNotes,
        reviewedDocs,
        setReviewedDocs
      }
    ) })
  ] });
}
function ReviewSection({
  meta,
  state,
  onChange,
  onSave
}) {
  const [open, setOpen] = reactExports.useState(false);
  const wordCount = state.notes.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = wordCount > 500;
  const done = state.status === "Done";
  const bump = (patch) => {
    const updated = { ...state, ...patch };
    if (updated.status === "Not reviewed") updated.status = "In review";
    onChange(updated);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("rounded-2xl border bg-card shadow-card overflow-hidden transition-colors", done ? "border-success/40" : "border-border/60"), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen((o) => !o), className: cn("w-full flex items-center gap-3 px-5 py-4 text-left", done && "bg-success/5"), children: [
      open ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: meta.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mt-0.5", children: [
          state.rating > 0 ? `${state.rating}/5 stars` : "Not rated",
          " · ",
          Object.values(state.checks).filter(Boolean).length,
          "/",
          meta.checks.length,
          " checks"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: state.status })
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-5 pb-5 space-y-4 border-t border-border/60 pt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(StarRating, { value: state.rating, onChange: (v) => bump({ rating: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: state.notes,
            onChange: (e) => bump({ notes: e.target.value }),
            placeholder: `Your notes on ${meta.label.toLowerCase()}`,
            className: cn(
              "w-full min-h-[100px] rounded-[10px] border bg-background p-3 text-sm focus:outline-none focus:border-brand/50",
              overLimit ? "border-destructive/60" : "border-border/60"
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("text-[11px] mt-1 flex justify-end", overLimit ? "text-destructive" : "text-muted-foreground"), children: [
          wordCount,
          " / 500 words"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 gap-2", children: meta.checks.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-sm rounded-md border border-border/60 px-3 py-2 hover:bg-accent/40 cursor-pointer", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: !!state.checks[c],
            onChange: (e) => bump({ checks: { ...state.checks, [c]: e.target.checked } }),
            className: "h-4 w-4 rounded border-border accent-[hsl(var(--brand))]"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: c })
      ] }, c)) }),
      meta.key === "qa" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "text-xs inline-flex items-center gap-1 text-brand hover:underline", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3 w-3" }),
        " Download Q&A Report"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end pt-2 border-t border-border/40", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => onSave({ ...state, status: "Done" }),
          disabled: overLimit,
          className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }),
            " Mark as reviewed"
          ]
        }
      ) })
    ] })
  ] });
}
function StatusPill({ status }) {
  const tone = status === "Done" ? "bg-success/15 text-success" : status === "In review" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-[10px] px-2 py-0.5 rounded-full font-medium", tone), children: status });
}
function StarRating({ value, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
    [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => onChange(n), className: "p-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { className: cn("h-5 w-5 transition-colors", n <= value ? "fill-warning text-warning" : "text-muted-foreground/40") }) }, n)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: value > 0 ? `${value}/5` : "Tap to rate" })
  ] });
}
function DecisionZone({
  avg,
  currentStatus,
  onDecision
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-6 space-y-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-5 w-5 text-destructive" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Decision Zone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Your decision will be visible to the founder immediately." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-[10px] bg-card border border-border/60 p-4 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs uppercase tracking-wider text-muted-foreground font-semibold", children: "Overall deal score" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-3xl font-semibold mt-1", children: [
          avg.toFixed(1),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base text-muted-foreground font-normal", children: "/ 5.0" })
        ] })
      ] }),
      currentStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs px-3 py-1.5 rounded-full bg-${decisionTone(currentStatus)}/15 text-${decisionTone(currentStatus)} font-medium`, children: currentStatus })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Under Review", icon: Clock, tone: "brand", label: "Under Review", sub: "Still evaluating", onDecision }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Request More Info", icon: FileQuestionMark, tone: "warning", label: "Request More Info", sub: "Ask the founder for specifics", onDecision }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Move to Partner Review", icon: Users, tone: "violet", label: "Move to Partner Review", sub: "Escalate to your partnership", onDecision }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Term Sheet Ready", icon: FileCheck, tone: "success", label: "Term Sheet Ready", sub: "Notify founder you're ready to proceed", onDecision }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Not Proceeding", icon: CircleX, tone: "destructive", label: "Not Proceeding", sub: "Decline with reason", onDecision }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionButton, { type: "Exit", icon: LogOut, tone: "muted-foreground", label: "Exit Deal Room", sub: "Remove your access", onDecision })
    ] })
  ] });
}
function DecisionButton({
  type,
  icon: Icon,
  tone,
  label,
  sub,
  onDecision
}) {
  const [openForm, setOpenForm] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [reason, setReason] = reactExports.useState("Stage too early");
  const [message2, setMessage] = reactExports.useState("");
  const [what, setWhat] = reactExports.useState("");
  const [deadline, setDeadline] = reactExports.useState("");
  const requiresForm = type === "Request More Info" || type === "Not Proceeding" || type === "Exit";
  const requiresConfirm = type === "Term Sheet Ready";
  const submit = async () => {
    setLoading(true);
    try {
      if (type === "Request More Info") {
        if (!what.trim()) return;
        await onDecision(type, { requestInfo: { what, deadline } });
      } else if (type === "Not Proceeding" || type === "Exit") {
        await onDecision(type, { reason, message: message2 });
      } else {
        await onDecision(type);
      }
      setOpenForm(false);
    } finally {
      setLoading(false);
    }
  };
  const handleClick = async () => {
    if (requiresForm || requiresConfirm) {
      setOpenForm(true);
    } else {
      setLoading(true);
      try {
        await onDecision(type);
      } finally {
        setLoading(false);
      }
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: handleClick,
        disabled: loading,
        className: cn(
          "w-full h-12 rounded-[10px] border flex items-center gap-3 px-4 text-left transition-colors disabled:opacity-60",
          `border-${tone}/40 bg-${tone}/10 hover:bg-${tone}/15 text-${tone}`
        ),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-5 w-5 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold leading-tight", children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] opacity-80", children: sub })
          ] })
        ]
      }
    ),
    openForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 rounded-[10px] border border-border/60 bg-card p-4 space-y-3", children: [
      type === "Request More Info" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "What information is needed?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: what, onChange: (e) => setWhat(e.target.value), className: "mt-1 w-full min-h-[80px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Deadline" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: deadline, onChange: (e) => setDeadline(e.target.value), className: "mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] })
      ] }),
      (type === "Not Proceeding" || type === "Exit") && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Reason" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: reason, onChange: (e) => setReason(e.target.value), className: "mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm", children: ["Stage too early", "Outside thesis", "Team concerns", "Market concerns", "Financial concerns", "Other"].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: r }, r)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-medium", children: "Message to founder (optional)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: message2, onChange: (e) => setMessage(e.target.value), className: "mt-1 w-full min-h-[60px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" })
        ] })
      ] }),
      requiresConfirm && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm", children: "This will notify the founder you are ready to proceed to term sheet. Continue?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setOpenForm(false), className: "rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: submit, disabled: loading, className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-60", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }),
          " ",
          requiresConfirm ? "Confirm" : "Send"
        ] })
      ] })
    ] })
  ] });
}
function DocumentPreview({
  activeDoc,
  setActiveDoc,
  docNotes,
  setDocNotes,
  reviewedDocs,
  setReviewedDocs
}) {
  const note = docNotes[activeDoc] ?? "";
  const reviewed = !!reviewedDocs[activeDoc];
  const [page, setPage] = reactExports.useState(1);
  const [zoom, setZoom] = reactExports.useState(100);
  const [savedAt, setSavedAt] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setSavedAt((/* @__PURE__ */ new Date()).toLocaleTimeString()), 800);
    return () => clearTimeout(t);
  }, [note]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-b border-border/60 space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: activeDoc, onChange: (e) => {
          setActiveDoc(e.target.value);
          setPage(1);
        }, className: "flex-1 rounded-[10px] border border-border/60 bg-background p-2 text-sm", children: DOCS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: d }, d)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground px-1", children: [
            "Page ",
            page,
            " of 12"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPage((p) => Math.min(12, p + 1)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { className: "h-3.5 w-3.5" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setZoom((z) => Math.max(50, z - 10)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomOut, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground px-1", children: [
            zoom,
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setZoom((z) => Math.min(200, z + 10)), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => window.print(), className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-3.5 w-3.5" }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-muted/40 p-6 grid place-items-center min-h-[420px]", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "bg-background rounded-md shadow-elev w-full max-w-md aspect-[3/4] grid place-items-center text-center p-6",
        style: { transform: `scale(${zoom / 100})`, transformOrigin: "center" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-10 w-10 text-muted-foreground/50 mx-auto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium mt-3", children: activeDoc }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
            "Page ",
            page,
            " preview"
          ] })
        ] })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-2 border-t border-border/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Your notes on this document" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: savedAt ? `Saved ${savedAt}` : "Auto-saves" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: note,
          onChange: (e) => setDocNotes({ ...docNotes, [activeDoc]: e.target.value }),
          placeholder: "Notes for this document only…",
          className: "w-full min-h-[90px] rounded-[10px] border border-border/60 bg-background p-2 text-sm focus:outline-none focus:border-brand/50"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
          note.length,
          " chars"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: reviewed,
              onChange: (e) => setReviewedDocs({ ...reviewedDocs, [activeDoc]: e.target.checked }),
              className: "h-4 w-4 accent-[hsl(var(--brand))]"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Mark this document as reviewed" })
        ] })
      ] })
    ] })
  ] });
}
function FounderReview({ dealRoomId }) {
  const { user } = useAuth();
  const { data: decision, isLoading } = useLatestDecision(dealRoomId);
  const dbStatus = decision?.status ?? null;
  const displayStatus = dbStatus ? DB_TO_DECISION[dbStatus] : null;
  const currentStageIndex = reactExports.useMemo(() => {
    if (!dbStatus) return 1;
    if (dbStatus === "term_sheet") return 4;
    if (dbStatus === "partner_review") return 3;
    if (dbStatus === "info_requested" || dbStatus === "under_review") return 2;
    if (dbStatus === "rejected" || dbStatus === "exited") return -1;
    return 1;
  }, [dbStatus]);
  const { data: activitiesData } = useQuery({
    queryKey: ["investor-activities", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("id, action, created_at").eq("deal_room_id", dealRoomId).neq("actor_id", user.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    }
  });
  const activities = activitiesData ?? [];
  const sections = initSections(decision?.metadata);
  const decisionForCard = displayStatus ? {
    status: displayStatus,
    updatedAt: decision.created_at,
    requestInfo: decision.metadata?.["request_info"],
    reason: decision.metadata?.["reason"],
    message: decision.notes
  } : null;
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-4 w-64 rounded bg-muted/60 animate-pulse" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-semibold tracking-tight", children: "Deal Progress" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Track where investors are in their review process." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 overflow-x-auto pb-2", children: STAGES.map((stage, i) => {
      const done = currentStageIndex >= 0 && i < currentStageIndex;
      const current = currentStageIndex >= 0 && i === currentStageIndex;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn(
            "h-9 w-9 rounded-full grid place-items-center text-xs font-semibold",
            done ? "bg-success/15 text-success" : current ? "bg-violet/15 text-violet ring-2 ring-violet" : "bg-muted text-muted-foreground"
          ), children: done ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4" }) : i + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("text-[11px] text-center w-20", current ? "text-violet font-semibold" : "text-muted-foreground"), children: stage })
        ] }),
        i < STAGES.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-0.5 w-8", done ? "bg-success" : "bg-border") })
      ] }, stage);
    }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DecisionStatusCard, { decision: decisionForCard }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold mb-4", children: "Review Progress" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: SECTION_META.map((meta) => {
        const s = sections[meta.key];
        const checks = Object.values(s.checks).filter(Boolean).length;
        const total = meta.checks.length;
        const pct = s.status === "Done" ? 100 : Math.round(checks / total * 100);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs mb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: meta.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: s.status === "Done" ? "Complete ✓" : pct === 0 ? "Not started" : `${pct}% reviewed` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-full transition-all", s.status === "Done" ? "bg-success" : "bg-gradient-brand"), style: { width: `${pct}%` } }) })
        ] }, meta.key);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold mb-3", children: "Activity" }),
      activities.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground py-6 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-5 w-5 text-muted-foreground/40 mx-auto mb-2" }),
        "Investor activity will appear here as they review your deal."
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2.5", children: activities.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-brand" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: a.action }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: relTime(a.created_at) })
      ] }, a.id)) })
    ] })
  ] });
}
function DecisionStatusCard({ decision }) {
  if (!decision) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 shadow-card border-l-4 border-l-brand", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-5 w-5 text-brand" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Awaiting investor review" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1.5", children: "No decisions yet." })
    ] });
  }
  const { status, updatedAt, requestInfo, reason, message: message2 } = decision;
  const config = {
    "Under Review": { tone: "brand", emoji: "🔍", title: "Under Review", body: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "Last activity: ",
      relTime(updatedAt)
    ] }) },
    "Request More Info": {
      tone: "warning",
      emoji: "⚠️",
      title: "Information Requested",
      body: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Requested:" }),
          " ",
          requestInfo?.what || "—"
        ] }),
        requestInfo?.deadline && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Deadline:" }),
          " ",
          requestInfo.deadline
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "mt-2 inline-flex items-center gap-1 text-warning text-xs font-medium hover:underline", children: "Upload requested documents →" })
      ] })
    },
    "Move to Partner Review": { tone: "violet", emoji: "⭐", title: "Advanced to Partner Review", body: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "Your deal has been escalated. This is a strong positive signal." }) },
    "Term Sheet Ready": { tone: "success", emoji: "🎉", title: "Term Sheet Ready!", body: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "Congratulations — the investor is ready to proceed. Check your email." }) },
    "Not Proceeding": {
      tone: "muted-foreground",
      emoji: "✕",
      title: "Not Proceeding",
      body: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Reason:" }),
          " ",
          reason || "—"
        ] }),
        message2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm", children: [
          '"',
          message2,
          '"'
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs italic mt-2", children: "This is not the end. Keep going." })
      ] })
    },
    "Exit": { tone: "muted-foreground", emoji: "←", title: "Investor Exited", body: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: reason || "Investor has left the deal room." }) }
  };
  const c = config[status];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-2xl border bg-card p-6 shadow-card border-l-4 border-l-${c.tone} bg-${c.tone}/5`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xl", children: c.emoji }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: c.title })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground mt-2", children: c.body })
  ] });
}
function createStore(initial) {
  let state = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => state,
    set: (updater) => {
      state = updater(state);
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    }
  };
}
const participantsStore = createStore([]);
const qaStore = createStore([]);
const generatedNdaDocsStore = createStore([]);
function useStore(s) {
  return reactExports.useSyncExternalStore(s.subscribe, s.get, s.get);
}
const useParticipants = () => useStore(participantsStore);
const useGeneratedNdaDocs = () => useStore(generatedNdaDocsStore);
const tabs = [{
  k: "overview",
  l: "Overview",
  i: LayoutGrid
}, {
  k: "documents",
  l: "Documents",
  i: FileText
}, {
  k: "qa",
  l: "Q&A",
  i: MessageSquare
}, {
  k: "checklist",
  l: "Checklist",
  i: ListChecks
}, {
  k: "chat",
  l: "Team chat",
  i: MessagesSquare
}, {
  k: "notes",
  l: "Notes",
  i: StickyNote
}, {
  k: "timeline",
  l: "Activity",
  i: Activity
}, {
  k: "meetings",
  l: "Meetings",
  i: Calendar
}, {
  k: "decision",
  l: "Review",
  i: Gavel
}];
function DealRoom() {
  const {
    id: dealRoomId
  } = Route.useParams();
  const [tab, setTab] = reactExports.useState("overview");
  const [aiOpen, setAiOpen] = reactExports.useState(false);
  const {
    user
  } = useAuth();
  useQueryClient();
  const navigate = useNavigate();
  const isInvestor = user?.appRole === "investor";
  const userName = user?.name ?? (isInvestor ? "Investor" : "Founder");
  const {
    data: room
  } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select("*, startups(company_name)").eq("id", dealRoomId).single();
      if (error) throw error;
      return data;
    }
  });
  const {
    data: memberRow
  } = useQuery({
    queryKey: ["deal-room-member", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("*").eq("deal_room_id", dealRoomId).eq("user_id", user.id).maybeSingle();
      return data;
    }
  });
  const {
    data: memberList = []
  } = useQuery({
    queryKey: ["deal-room-members", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("*, users(full_name, email, role)").eq("deal_room_id", dealRoomId);
      return data ?? [];
    }
  });
  const {
    data: qaMessages = []
  } = useQuery({
    queryKey: ["deal-room-qa", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("messages").select("*").eq("deal_room_id", dealRoomId).eq("is_qa", true).order("created_at", {
        ascending: true
      });
      return data ?? [];
    }
  });
  const {
    data: ndaAcceptance,
    isLoading: ndaLoading
  } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("nda_acceptances").select("id, accepted_at").eq("deal_room_id", dealRoomId).eq("user_id", user.id).maybeSingle();
      return data ?? null;
    }
  });
  reactExports.useEffect(() => {
    if (!ndaLoading && user?.id && !ndaAcceptance) {
      navigate({
        to: "/app/deal-room/$id/nda",
        params: {
          id: dealRoomId
        }
      });
    }
  }, [ndaLoading, ndaAcceptance, user?.id, navigate, dealRoomId]);
  reactExports.useEffect(() => {
    if (qaMessages.length > 0) {
      const mapped = qaMessages.map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        side: m.metadata?.side ?? "investor-to-founder",
        authorRole: m.metadata?.authorRole ?? "Investor",
        authorName: m.metadata?.authorName ?? "Unknown",
        question: m.body,
        answer: m.metadata?.answer,
        answeredAt: m.metadata?.answeredAt,
        createdAt: m.created_at,
        editedAt: m.metadata?.editedAt
      }));
      qaStore.set(() => mapped);
    }
  }, [qaMessages]);
  reactExports.useEffect(() => {
    if (memberList.length > 0) {
      const mapped = memberList.map((m) => ({
        id: m.id,
        dealRoomId: m.deal_room_id,
        name: m.users?.full_name ?? "Unknown",
        email: m.users?.email ?? "",
        role: m.role,
        company: "",
        status: m.accepted_at ? "NDA Accepted" : "Invited",
        dateJoined: m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : void 0
      }));
      participantsStore.set(() => mapped);
    }
  }, [memberList]);
  room?.startups?.company_name ? `${room.startups.company_name} — Deal Room` : "Deal Room";
  const companyName = room?.startups?.company_name ?? "Unknown Company";
  if (!user?.id || ndaLoading || !ndaAcceptance) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex h-[calc(100vh-4rem)] items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Verifying access…" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex h-[calc(100vh-4rem)] relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-[260px] border-r border-border/60 bg-sidebar flex flex-col", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 border-b border-border/60", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/deal-rooms", className: "text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "h-3 w-3" }),
          " All deal rooms"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold", children: companyName[0] ?? "D" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold truncate", children: companyName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: isInvestor ? "Founder · Deal Room" : "Investor · Deal Room" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 inline-flex items-center gap-1.5 text-[11px] text-success", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" }),
          " Active · NDA signed"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex-1 p-2 space-y-0.5 overflow-y-auto", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.k), className: `w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(t.i, { className: `h-4 w-4 ${tab === t.k ? "text-brand" : ""}` }),
        t.l
      ] }, t.k)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 border-t border-border/60 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "h-3 w-3 inline mr-1" }),
        " Encrypted · watermarked"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "flex-1 overflow-y-auto", children: [
      tab === "overview" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        isInvestor ? /* @__PURE__ */ jsxRuntimeExports.jsx(InvestorOverview, { companyName }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FounderOverview, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParticipantsSection, { dealRoomId })
      ] }),
      tab === "documents" && /* @__PURE__ */ jsxRuntimeExports.jsx(Documents, { dealRoomId }),
      tab === "chat" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DealRoomChat, {}) }),
      tab === "qa" && /* @__PURE__ */ jsxRuntimeExports.jsx(QA, { dealRoomId, userId: user?.id, userName }),
      tab === "checklist" && /* @__PURE__ */ jsxRuntimeExports.jsx(DDChecklist, {}),
      tab === "notes" && /* @__PURE__ */ jsxRuntimeExports.jsx(Notes, { dealRoomId, userId: user?.id }),
      tab === "timeline" && /* @__PURE__ */ jsxRuntimeExports.jsx(Timeline, { dealRoomId }),
      tab === "meetings" && /* @__PURE__ */ jsxRuntimeExports.jsx(MeetingsTab, { dealRoomId, userId: user?.id }),
      tab === "decision" && /* @__PURE__ */ jsxRuntimeExports.jsx(ReviewTab, { dealRoomId, currentUserRole: isInvestor ? "investor" : "founder", startupId: room?.startup_id ?? "" })
    ] }),
    !aiOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setAiOpen(true), className: "absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }),
      " Ask AI"
    ] }),
    aiOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm", onClick: () => setAiOpen(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold leading-tight", children: "Deal Room AI" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-muted-foreground", children: companyName })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setAiOpen(false), className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(AIChat, { compact: true, scope: `the ${companyName} deal room`, initialAssistant: "I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything.", starters: isInvestor ? ["Summarize this deal in 3 bullets.", "What are the top 3 risks?", "How does ARR growth compare to peers?", "Draft my partner meeting memo."] : ["Summarize this deal in 3 bullets.", "What diligence items are still open?", "Draft a follow-up to the investor.", "Flag the top 3 risks."] }) })
      ] })
    ] })
  ] });
}
function FounderOverview() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Deal room" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-semibold tracking-tight", children: "Active Investor Review" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground max-w-2xl", children: "Active diligence in progress." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Invite"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }),
          " Send update"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["Stage", "Diligence", TrendingUp, "brand"], ["Probability", "65%", Target, "success"], ["Days open", "12", Clock, "violet"], ["Open items", "4", CircleAlert, "warning"]].map(([l, v, I, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: l }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: `h-3.5 w-3.5 text-${c}` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-xl font-semibold", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2 rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Investor activity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 space-y-3", children: [["Investor opened Cohort analysis v2.pdf", "12m ago", "brand"], ["Investor viewed pitch deck (4th time)", "1h ago", "violet"], ["Investor asked a question in Q&A", "2h ago", "warning"], ["NDA signed", "yesterday", "success"]].map(([t, d, c], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `h-1.5 w-1.5 rounded-full bg-${c}` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1", children: t }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: d })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: "Next steps" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-4 w-4 text-success mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Customer ref calls scheduled" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4 text-warning mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Cap table review by Fri" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-4 w-4 text-warning mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Forecast model 2026" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "h-4 w-4 text-destructive mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "SOC2 evidence (blocked)" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function InvestorOverview({
  companyName
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Reviewing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "mt-1 text-2xl font-semibold tracking-tight", children: companyName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1.5 text-sm text-muted-foreground max-w-2xl", children: "Active deal room — review documents, Q&A, and checklist." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 text-success px-3 py-2 text-sm hover:bg-success/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbsUp, { className: "h-4 w-4" }),
          " Accept"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 text-warning px-3 py-2 text-sm hover:bg-warning/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleQuestionMark, { className: "h-4 w-4" }),
          " Request info"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm hover:bg-destructive/15", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThumbsDown, { className: "h-4 w-4" }),
          " Pass"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-3", children: [["ARR", "$4.2M", "+318% YoY", DollarSign, "success"], ["Customers", "12", "F500: 4", Users, "brand"], ["Net retention", "134%", "Best-in-class", TrendingUp, "violet"], ["Runway", "18mo", "post-raise", Shield, "warning"]].map(([l, v, d, I, c]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: l }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(I, { className: `h-3.5 w-3.5 text-${c}` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-xl font-semibold", children: v }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-muted-foreground", children: d })
    ] }, l)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "h-4 w-4 text-brand" }),
          " Round details"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 space-y-2.5 text-sm", children: [["Round", "Series A"], ["Target", "$8M"], ["Soft circled", "$3.2M"], ["Lead", "Open"], ["Valuation", "$48M post"], ["Close", "~6 weeks"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: v })
        ] }, l)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-brand/30 bg-gradient-to-br from-brand/5 to-violet/5 p-5 shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand" }),
          " AI decision summary"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 space-y-2 text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success mt-0.5", children: "+" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Strong NRR (134%) and F500 traction (4/12 customers)." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success mt-0.5", children: "+" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Founders with deep domain expertise — proven shippers." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-warning mt-0.5", children: "!" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Hardware GM concentration: top 3 customers = 41% ARR." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive mt-0.5", children: "−" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Capex-heavy. Watch BOM trajectory before Y2." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "mt-4 text-xs text-brand hover:underline", children: "Generate full investment memo →" })
      ] })
    ] })
  ] });
}
const sampleDocs = [{
  name: "Pitch deck v3.pdf",
  category: "Strategy"
}, {
  name: "Financial model Q4.xlsx",
  category: "Finance"
}, {
  name: "Cap table current.xlsx",
  category: "Legal"
}, {
  name: "Product roadmap 2025.pdf",
  category: "Product"
}];
function Documents({
  dealRoomId
}) {
  const queryClient = useQueryClient();
  const {
    data: docs = []
  } = useQuery({
    queryKey: ["documents", dealRoomId],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("documents").select("*").eq("deal_room_id", dealRoomId).order("created_at", {
        ascending: false
      });
      return data ?? [];
    }
  });
  const ndaDocs = useGeneratedNdaDocs().filter((d) => d.dealRoomId === dealRoomId);
  const handleDownload = async (storagePath) => {
    const {
      data
    } = await supabase.storage.from("documents").createSignedUrl(storagePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Documents" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Request document" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Dropzone, { dealRoomId, onUploadComplete: () => queryClient.invalidateQueries({
      queryKey: ["documents", dealRoomId]
    }) }) }),
    ndaDocs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "System generated" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: ndaDocs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-success/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "h-4 w-4 text-success" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: d.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground", children: [
            "Auto-generated NDA · ",
            new Date(d.createdAt).toLocaleDateString()
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }),
          " Signed by all"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) })
      ] }, d.name)) })
    ] }),
    docs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: docs.map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: doc.storage_path?.split("/").pop() ?? "Document" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: doc.category ?? "General" })
      ] }),
      doc.status === "ready" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-success text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "h-3.5 w-3.5" }),
        " Ready"
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }),
        " Review"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => handleDownload(doc.storage_path), className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) })
    ] }, doc.id)) }),
    docs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2", children: "Sample documents" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60", children: sampleDocs.map((doc) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-3 opacity-50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-md bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium truncate", children: doc.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: doc.category })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 text-warning text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "h-3.5 w-3.5" }),
          " Review"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: true, className: "text-muted-foreground/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "h-4 w-4" }) })
      ] }, doc.name)) })
    ] })
  ] });
}
function ParticipantsSection({
  dealRoomId
}) {
  const all = useParticipants();
  const list = all.filter((p) => p.dealRoomId === dealRoomId);
  const statusColor = (s) => s === "NDA Accepted" || s === "Active" ? "bg-success/10 text-success" : s === "Joined" ? "bg-brand/10 text-brand" : "bg-warning/10 text-warning";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-8 pb-10 max-w-5xl mx-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card p-5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "h-4 w-4 text-brand" }),
        " Participants"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(UserPlus, { className: "h-3.5 w-3.5" }),
        " Invite"
      ] })
    ] }),
    list.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-xs text-muted-foreground", children: "No participants yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 divide-y divide-border/60", children: list.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-12 gap-2 py-3 items-center text-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-3 flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0", children: p.name.split(" ").map((s) => s[0]).slice(0, 2).join("") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium truncate", children: p.name })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-3 text-muted-foreground truncate", children: p.email }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-muted-foreground truncate", children: p.role }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2 text-muted-foreground truncate", children: p.company || "—" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: cn("text-[10px] px-2 py-0.5 rounded", statusColor(p.status)), children: p.status }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-1 text-right text-xs text-muted-foreground", children: p.dateJoined ?? "—" })
    ] }, p.id)) })
  ] }) });
}
function Notes({
  dealRoomId,
  userId
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = reactExports.useState("");
  const [isPrivate, setIsPrivate] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const {
    data: notes = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["notes", dealRoomId],
    queryFn: async () => {
      const filter = userId ? `private.eq.false,author_id.eq.${userId}` : "private.eq.false";
      const {
        data,
        error
      } = await supabase.from("notes").select("*, users(full_name)").eq("deal_room_id", dealRoomId).or(filter).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim() || !userId) return;
    setSaving(true);
    try {
      await supabase.from("notes").insert({
        deal_room_id: dealRoomId,
        author_id: userId,
        body: body.trim(),
        private: isPrivate
      });
      await logActivity(dealRoomId, userId, "Added a note");
      queryClient.invalidateQueries({
        queryKey: ["notes", dealRoomId]
      });
      setBody("");
      setIsPrivate(false);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Notes" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "mt-5 rounded-xl border border-border/60 bg-card p-4 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: body, onChange: (e) => setBody(e.target.value), placeholder: "Write a note…", rows: 3, className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: isPrivate, onChange: (e) => setIsPrivate(e.target.checked), className: "h-4 w-4 accent-[var(--brand)]" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Private (only visible to me)" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", disabled: !body.trim() || saving, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50", children: [
          saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }),
          "Save note"
        ] })
      ] })
    ] }),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-5 grid gap-3", children: notes.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `rounded-xl border border-border/60 p-4 shadow-card ${n.private ? "bg-warning/5 border-warning/30" : "bg-card"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: n.author_id === userId ? "You" : n.users?.full_name ?? "Unknown" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: formatDistanceToNow(new Date(n.created_at), {
          addSuffix: true
        }) }),
        n.private && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-auto text-[10px] uppercase tracking-wider text-warning", children: "Private" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 text-sm", children: n.body })
    ] }, n.id)) })
  ] });
}
function Timeline({
  dealRoomId
}) {
  const {
    data: events = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["activities", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("activities").select("*, users(full_name)").eq("deal_room_id", dealRoomId).order("created_at", {
        ascending: false
      }).limit(50);
      if (error) throw error;
      return data ?? [];
    }
  });
  const dotColor = (action) => {
    const a = action?.toLowerCase() ?? "";
    if (a.includes("signed") || a.includes("nda")) return "success";
    if (a.includes("upload") || a.includes("document")) return "brand";
    if (a.includes("message") || a.includes("question")) return "violet";
    if (a.includes("invited") || a.includes("member")) return "warning";
    return "muted-foreground";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Activity" }),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    !isLoading && !isError && events.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-sm text-muted-foreground", children: "No activity yet. Activity is recorded automatically as the deal room is used." }),
    events.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 relative pl-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-2 top-2 bottom-2 w-px bg-border" }),
      events.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative pb-6 last:pb-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-${dotColor(e.action)} ring-4 ring-background` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: e.action }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "h-3 w-3" }),
          e.users?.full_name ? `${e.users.full_name} · ` : "",
          formatDistanceToNow(new Date(e.created_at), {
            addSuffix: true
          })
        ] })
      ] }, e.id))
    ] })
  ] });
}
function MeetingsTab({
  dealRoomId,
  userId
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [f, setF] = reactExports.useState({
    title: "",
    scheduledAt: "",
    meetingLink: "",
    notes: ""
  });
  const set = (k, v) => setF((s) => ({
    ...s,
    [k]: v
  }));
  const {
    data: meetings = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["meetings", dealRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("meetings").select("*").eq("deal_room_id", dealRoomId).order("scheduled_at", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.title || !f.scheduledAt || !userId) return;
    setSaving(true);
    try {
      await supabase.from("meetings").insert({
        deal_room_id: dealRoomId,
        title: f.title,
        scheduled_at: new Date(f.scheduledAt).toISOString(),
        meeting_link: f.meetingLink || null,
        notes: f.notes || null,
        created_by: userId
      });
      await logActivity(dealRoomId, userId, "Scheduled a meeting");
      queryClient.invalidateQueries({
        queryKey: ["meetings", dealRoomId]
      });
      setF({
        title: "",
        scheduledAt: "",
        meetingLink: "",
        notes: ""
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };
  const now = /* @__PURE__ */ new Date();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at) >= now);
  const past = meetings.filter((m) => new Date(m.scheduled_at) < now);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-8 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Meetings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowForm((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Schedule meeting"
      ] })
    ] }),
    showForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: submit, className: "mt-5 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Title *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, value: f.title, onChange: (e) => set("title", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Date & Time *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "datetime-local", required: true, value: f.scheduledAt, onChange: (e) => set("scheduledAt", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Meeting link" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "url", value: f.meetingLink, onChange: (e) => set("meetingLink", e.target.value), placeholder: "Zoom / Google Meet / Teams link", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Notes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: f.notes, onChange: (e) => set("notes", e.target.value), rows: 2, className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setShowForm(false), className: "rounded-md border border-border/60 px-3 py-1.5 text-sm", children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", disabled: !f.title || !f.scheduledAt || saving, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm disabled:opacity-50", children: [
          saving && /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3 w-3 animate-spin" }),
          "Add meeting"
        ] })
      ] })
    ] }),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-4 text-sm text-destructive", children: "Could not load data. Please refresh." }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
    upcoming.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Upcoming" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-3", children: upcoming.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MeetingCard, { m }, m.id)) })
    ] }),
    past.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold", children: "Past" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 space-y-3 opacity-60", children: past.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MeetingCard, { m }, m.id)) })
    ] }),
    !isLoading && meetings.length === 0 && !showForm && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-6 text-sm text-muted-foreground", children: "No meetings scheduled yet." })
  ] });
}
function MeetingCard({
  m
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-semibold", children: m.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground shrink-0", children: format(new Date(m.scheduled_at), "EEE, d MMM · h:mm a") })
    ] }),
    m.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1 text-sm text-muted-foreground", children: m.notes }),
    m.meeting_link && /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: m.meeting_link, target: "_blank", rel: "noopener noreferrer", className: "mt-3 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { className: "h-3 w-3" }),
      " Join meeting"
    ] })
  ] });
}
function QA({
  dealRoomId,
  userId,
  userName
}) {
  const [msgs, setMsgs] = reactExports.useState([]);
  const [input, setInput] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [loadError, setLoadError] = reactExports.useState(false);
  const [sending, setSending] = reactExports.useState(false);
  const scrollRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    (async () => {
      const {
        data,
        error
      } = await supabase.from("messages").select("*, users(full_name)").eq("deal_room_id", dealRoomId).eq("private_to_org", false).order("created_at", {
        ascending: true
      });
      if (error) setLoadError(true);
      else setMsgs(data ?? []);
      setLoading(false);
    })();
  }, [dealRoomId]);
  reactExports.useEffect(() => {
    const channel = supabase.channel("qa-" + dealRoomId).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: "deal_room_id=eq." + dealRoomId
    }, async (payload) => {
      const msg = payload.new;
      if (msg.private_to_org) return;
      let senderName = userName;
      if (msg.sender_id !== userId) {
        const {
          data
        } = await supabase.from("users").select("full_name").eq("id", msg.sender_id).single();
        senderName = data?.full_name ?? "Unknown";
      }
      setMsgs((xs) => xs.find((x) => x.id === msg.id) ? xs : [...xs, {
        ...msg,
        users: {
          full_name: senderName
        }
      }]);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealRoomId, userId, userName]);
  reactExports.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [msgs]);
  const send = async () => {
    const text = input.trim();
    if (!text || !userId) return;
    setSending(true);
    const optId = crypto.randomUUID();
    setMsgs((xs) => [...xs, {
      id: optId,
      sender_id: userId,
      body: text,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      private_to_org: false,
      users: {
        full_name: userName
      },
      _opt: true
    }]);
    setInput("");
    const {
      data
    } = await supabase.from("messages").insert({
      deal_room_id: dealRoomId,
      sender_id: userId,
      body: text,
      private_to_org: false
    }).select("id").single();
    if (data?.id) {
      setMsgs((xs) => xs.map((x) => x.id === optId ? {
        ...x,
        id: data.id,
        _opt: false
      } : x));
      const {
        data: members
      } = await supabase.from("deal_room_members").select("user_id").eq("deal_room_id", dealRoomId).neq("user_id", userId);
      for (const m of members ?? []) {
        await createNotification(m.user_id, "New Q&A message", text.slice(0, 100), "message", dealRoomId, `/app/deal-room/${dealRoomId}`);
      }
    }
    setSending(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-8 pt-6 pb-4 border-b border-border/60 shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-semibold tracking-tight", children: "Q&A Discussion" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Public deal room discussion thread." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-8 py-4 space-y-3", children: [
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground animate-pulse", children: "Loading…" }),
      loadError && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-destructive", children: "Could not load data. Please refresh." }),
      !loading && !loadError && msgs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground", children: "No messages yet. Start the conversation." }),
      msgs.map((m, i) => {
        const isMe = m.sender_id === userId;
        const name = isMe ? userName : m.users?.full_name ?? "Unknown";
        const prev = msgs[i - 1];
        const grouped = prev && prev.sender_id === m.sender_id;
        const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("");
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex gap-3", isMe ? "flex-row-reverse" : ""), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("h-8 w-8 shrink-0", grouped && "invisible"), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", isMe ? "bg-gradient-brand text-brand-foreground" : "bg-accent"), children: initials }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("max-w-[72%]", isMe && "items-end flex flex-col"), children: [
            !grouped && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: cn("flex items-center gap-2 mb-1 text-[11px]", isMe && "flex-row-reverse"), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: format(new Date(m.created_at), "h:mm a") })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: cn("rounded-2xl px-3.5 py-2 text-sm", isMe ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"), children: m.body })
          ] })
        ] }, m.id);
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-8 py-4 border-t border-border/60 bg-background shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 1, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }, placeholder: "Ask a question or leave a comment…", className: "flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: send, disabled: !input.trim() || !userId || sending, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50", children: [
        sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }),
        "Send"
      ] })
    ] }) })
  ] });
}
export {
  DealRoom as component
};
