function summarizeStudents(students = []) {
  const total = students.length;
  const present = students.filter((student) => student.today_status === 'PRESENT').length;
  const late = students.filter((student) => student.today_status === 'LATE').length;
  const absent = students.filter((student) => student.today_status === 'ABSENT').length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return {
    total,
    present,
    late,
    absent,
    attendanceRate,
  };
}

module.exports = {
  summarizeStudents,
};
