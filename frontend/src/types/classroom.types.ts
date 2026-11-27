export interface ClassroomLearningProfile {
  gradeLevel?: string | null
  studentCount?: number | null
  knowledgeScope?: string | null
  characteristics?: string | null
  favoriteTopics?: string | null
}

// Lớp học của giáo viên (UC-16, openapi `Classroom`): chỉ thông tin của lớp, không có dữ liệu của học sinh.
export interface Classroom {
  classroomId: string
  className: string
  schoolYear?: string | null
  schoolName?: string | null
  learningProfile?: ClassroomLearningProfile | null
}

export interface ClassroomInput {
  className: string
  schoolYear?: string
  schoolName?: string
  learningProfile?: ClassroomLearningProfile
}
