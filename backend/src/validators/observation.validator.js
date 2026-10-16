const ALLOWED_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"];
function result(value, errors = []) { return { isValid: errors.length === 0, value: errors.length ? null : value, errors }; }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function positiveInt(raw, name, fallback, min, max, errors) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) { errors.push(`${name} must be an integer between ${min} and ${max}.`); return fallback; }
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < min || n > max) { errors.push(`${name} must be between ${min} and ${max}.`); return fallback; }
  return n;
}
export function validateObservationListQuery(query = {}) {
  const errors = [];
  if (!object(query)) return result(null, ["Query parameters must be an object."]);
  const value = {
    days: positiveInt(query.days, "days", 3, 1, 10, errors),
    page: positiveInt(query.page, "page", 1, 1, 1000000, errors),
    limit: positiveInt(query.limit, "limit", 100, 1, 500, errors),
  };
  if (query.source !== undefined && query.source !== "") {
    if (typeof query.source !== "string" || !ALLOWED_SOURCES.includes(query.source.trim())) errors.push(`source must be one of: ${ALLOWED_SOURCES.join(", ")}.`);
    else value.source = query.source.trim();
  }
  return result(value, errors);
}
export function validateObservationRefreshBody(body = {}) {
  const errors = [];
  if (!object(body)) return result(null, ["Request body must be a JSON object."]);
  const value = { days: positiveInt(body.days, "days", 3, 1, 10, errors) };
  if (body.source !== undefined && body.source !== "") {
    if (typeof body.source !== "string" || !ALLOWED_SOURCES.includes(body.source.trim())) errors.push(`source must be one of: ${ALLOWED_SOURCES.join(", ")}.`);
    else value.source = body.source.trim();
  } else value.source = "VIIRS_SNPP_NRT";
  return result(value, errors);
}
