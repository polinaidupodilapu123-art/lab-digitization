

function sanitizeFileBase(name) {
  const t = name.trim().replace(/[^\w.\- ()]+/g, "_").replace(/\s+/g, " ");
  return t.length > 0 ? t.slice(0, 80) : "assignment-scores";
}

function cellMaxMarks(row, defaultMax) {
  const m = row.maxMarks;
  if (m != null && Number.isFinite(Number(m))) return Number(m);
  return defaultMax;
}

/**
 * Downloads a single-sheet `.xlsx` with college, degree, academic year, semester, roll, name,
 * subject, max marks, marks awarded, and remarks.
 */
export async function downloadAssignmentScoresXlsx(rows, fileNameBase, options) {
  const XLSX = await import("xlsx");
  const defaultMax = options?.defaultMaxMarks ?? 100;

  const header = [
    "Name of the College",
    "Course",
    "Academic Year",
    "Semester",
    "Mode",
    "Registered Number",
    "Name",
    "Name of the title / subject",
    "Max Marks",
    "Marks Awarded",
    "Remarks",
  ];

  const data = [
    [...header],
    ...rows.map((r) => [
      r.collegeName || "",
      r.course || r.degree || "",
      r.academicYear || "",
      r.semester || "",
      r.mode || "Regular",
      r.registeredNumber || "",
      r.fullName || "",
      r.subjectTitle || "",
      cellMaxMarks(r, defaultMax),
      r.marksAwarded != null && Number.isFinite(Number(r.marksAwarded))
        ? Number(r.marksAwarded)
        : "",
      r.remarks || "",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Scores");
  const safe = sanitizeFileBase(fileNameBase);
  XLSX.writeFile(wb, `${safe}.xlsx`);
}
