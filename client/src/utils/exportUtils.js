

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
    "Registration Number",
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

/**
 * Downloads a template Excel sheet for the specified master data tab key.
 */
export async function downloadMasterDataTemplate(tabKey) {
  const XLSX = await import("xlsx");

  let headers = [];
  let sampleData = [];

  switch (tabKey) {
    case "colleges":
      headers = ["College Code", "College Name", "Location", "District", "Latitude", "Longitude"];
      sampleData = [["COL101", "Sample College of Engineering", "Kakinada", "East Godavari", 16.98, 82.24]];
      break;
    case "courses":
      headers = ["Course Code", "Course Name"];
      sampleData = [["B.Tech", "Bachelor of Technology"]];
      break;
    case "subjects":
      headers = ["Subject Code", "Subject Name", "Semester", "Student Choice", "Type", "Alias Name", "Max Marks", "Pass Marks"];
      sampleData = [["CS101", "Computer Programming", "1-1", "R", "Theory", "CP", 100, 40]];
      break;
    case "groups":
      headers = ["Group Code", "Course Code", "Group Name", "Pedagogy1 Name", "Pedagogy2 Name"];
      sampleData = [["GP-CS", "B.Tech", "Computer Science", "Programming in C", "Data Structures"]];
      break;
    case "students":
      headers = ["Registration Number", "Student Name", "College Code", "Group Code", "Course Code", "Email"];
      sampleData = [["REG10001", "Alice Smith", "COL101", "GP-CS", "092", "alice@example.com"]];
      break;
    case "papers":
      headers = ["Paper Code", "Paper Name", "Subject Code", "Semester"];
      sampleData = [["PAP101", "Computer Science Core Paper", "CS101", "1-1"]];
      break;
    case "evaluators":
      headers = ["Full Name", "Email", "Password"];
      sampleData = [["Dr. Bob Johnson", "bob@example.com", "BobPass@123"]];
      break;
    case "principals":
      headers = ["Full Name", "College Code", "Email"];
      sampleData = [["Dr. Clara Oswald", "COL101", "clara@example.com"]];
      break;
    default:
      return;
  }

  const data = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const fileName = `${tabKey}_upload_template.xlsx`;
  XLSX.writeFile(wb, fileName);
}

