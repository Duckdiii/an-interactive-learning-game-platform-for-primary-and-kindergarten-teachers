ALTER TABLE teachers
    ADD COLUMN profile_school VARCHAR(255),
    ADD COLUMN textbook VARCHAR(100),
    ADD COLUMN preferred_voice VARCHAR(20),
    ADD COLUMN preferred_subject VARCHAR(30),
    ADD COLUMN preferred_grade_level VARCHAR(30);

ALTER TABLE classrooms
    ADD COLUMN grade_level VARCHAR(30),
    ADD COLUMN student_count INTEGER CHECK (student_count BETWEEN 1 AND 200),
    ADD COLUMN knowledge_scope VARCHAR(250),
    ADD COLUMN characteristics VARCHAR(250),
    ADD COLUMN favorite_topics VARCHAR(250);

CREATE TABLE teacher_suggestions (
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    suggestion_id VARCHAR(36) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    PRIMARY KEY (teacher_id, suggestion_id)
);
