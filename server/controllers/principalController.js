const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { College, Course, Subject } = require('../models/MasterData');

/**
 * Fetch stats, filters, and chart data for the logged-in Principal's college
 */
exports.getPrincipalDashboardStats = async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    if (!collegeId) {
      return res.status(400).json({ message: 'No college associated with this Principal account.' });
    }

    const { courseId, semester } = req.query;

    // 1. Fetch college details
    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ message: 'Associated college not found.' });
    }

    // 2. Build Student Query
    const studentQuery = { role: 'STUDENT', collegeId };
    if (courseId) studentQuery.courseId = courseId;
    if (semester) studentQuery.currentSemester = semester;

    const students = await User.find(studentQuery).select('_id');
    const studentIds = students.map(s => s._id);

    // 3. Build Assignment Query
    const assignmentQuery = { studentId: { $in: studentIds } };

    // 4. Calculate counts
    const totalStudents = students.length;
    const totalSubmitted = await Assignment.countDocuments({ ...assignmentQuery, status: 'Submitted' });
    const totalEvaluated = await Assignment.countDocuments({ ...assignmentQuery, status: 'Evaluated' });
    const totalPending = await Assignment.countDocuments({ ...assignmentQuery, status: 'Pending' });
    
    const uniquePendingStudentIds = await Assignment.distinct('studentId', { ...assignmentQuery, status: 'Pending' });
    const totalPendingStudents = uniquePendingStudentIds.length;

    // 5. Gather unique filters for dropdowns based on students in the college
    const collegeStudentFilters = await User.find({ role: 'STUDENT', collegeId })
      .populate('courseId', 'courseCode courseName')
      .lean();

    const uniqueCourses = [];
    const courseIdsSeen = new Set();
    const uniqueSemesters = new Set();

    collegeStudentFilters.forEach(stud => {
      if (stud.courseId) {
        const cId = stud.courseId._id.toString();
        if (!courseIdsSeen.has(cId)) {
          courseIdsSeen.add(cId);
          uniqueCourses.push({
            _id: stud.courseId._id,
            courseCode: stud.courseId.courseCode,
            courseName: stud.courseId.courseName
          });
        }
      }
      if (stud.currentSemester) {
        uniqueSemesters.add(stud.currentSemester);
      }
    });

    // 6. Gather chart progress data by Subject
    // Group assignments of these college students by subjectId or groupSubjectName
    const assignments = await Assignment.find(assignmentQuery)
      .populate('subjectId', 'subCode subName')
      .lean();

    const subjectProgressMap = {};

    assignments.forEach(asg => {
      let label = '';
      if (asg.subjectId) {
        label = asg.subjectId.subCode;
      } else if (asg.groupSubjectName) {
        label = asg.groupSubjectName;
      } else {
        label = 'Other';
      }

      if (!subjectProgressMap[label]) {
        subjectProgressMap[label] = {
          subjectLabel: label,
          submitted: 0,
          evaluated: 0,
          pending: 0
        };
      }

      if (asg.status === 'Submitted') subjectProgressMap[label].submitted++;
      else if (asg.status === 'Evaluated') subjectProgressMap[label].evaluated++;
      else if (asg.status === 'Pending') subjectProgressMap[label].pending++;
    });

    const subjectProgressData = Object.values(subjectProgressMap).sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));

    res.json({
      college: {
        collegeCode: college.collegeCode,
        collegeName: college.collegeName
      },
      counts: {
        totalStudents,
        totalSubmitted,
        totalEvaluated,
        totalPending,
        totalPendingStudents,
        totalSheets: totalSubmitted + totalEvaluated + totalPending
      },
      filters: {
        courses: uniqueCourses.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
        semesters: Array.from(uniqueSemesters).sort((a, b) => a.localeCompare(b))
      },
      chartData: subjectProgressData
    });

  } catch (error) {
    console.error('getPrincipalDashboardStats error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Fetch list of students who have pending (not submitted) records
 */
exports.getPendingStudents = async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    if (!collegeId) {
      return res.status(400).json({ message: 'No college associated with this Principal account.' });
    }

    const { courseId, semester } = req.query;

    // 1. Build Student Query
    const studentQuery = { role: 'STUDENT', collegeId };
    if (courseId) studentQuery.courseId = courseId;
    if (semester) studentQuery.currentSemester = semester;

    // Fetch students with their course info populated
    const students = await User.find(studentQuery)
      .populate('courseId', 'courseCode courseName')
      .lean();

    const studentIds = students.map(s => s._id);

    // 2. Fetch all Assignments for these students that are 'Pending'
    // Populate subject to get the name
    const pendingAssignments = await Assignment.find({
      studentId: { $in: studentIds },
      status: 'Pending'
    })
      .populate('subjectId', 'subCode subName aliasName')
      .lean();

    // 3. Group pending assignments by student
    const studentPendingMap = {};
    
    // Initialize map with all students, so we can filter down to only those with pending later, 
    // or just iterate assignments to be faster. Let's iterate assignments to only get defaulters.
    pendingAssignments.forEach(asg => {
      const sId = asg.studentId.toString();
      if (!studentPendingMap[sId]) {
        // Find the student object
        const student = students.find(s => s._id.toString() === sId);
        if (student) {
          studentPendingMap[sId] = {
            _id: student._id,
            fullName: student.fullName,
            regdNo: student.regdNo,
            courseId: student.courseId ? student.courseId._id : null,
            courseCode: student.courseId ? student.courseId.courseCode : 'N/A',
            courseName: student.courseId ? student.courseId.courseName : 'N/A',
            semester: student.currentSemester || 'N/A',
            pendingSubjects: []
          };
        }
      }
      
      if (studentPendingMap[sId]) {
        const subjectObj = {
          shortName: asg.subjectId ? (asg.subjectId.aliasName || asg.subjectId.subCode || asg.subjectId.subName) : (asg.groupSubjectName || 'Unknown'),
          fullName: asg.subjectId ? asg.subjectId.subName : (asg.groupSubjectName || 'Unknown Subject')
        };
        studentPendingMap[sId].pendingSubjects.push(subjectObj);
      }
    });

    // Convert map to array and sort by Registration Number
    const pendingStudentsList = Object.values(studentPendingMap).sort((a, b) => 
      (a.regdNo || '').localeCompare(b.regdNo || '')
    );

    res.json({
      success: true,
      data: pendingStudentsList
    });

  } catch (error) {
    console.error('getPendingStudents error:', error);
    res.status(500).json({ message: error.message });
  }
};
