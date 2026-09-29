package com.aigameplatform.backend.service.factory;

/** Các trường Backend gán cho mọi màn chơi, không phụ thuộc loại game. */
record QuestionBase(String id, int timeLimitSeconds, int points) {
}
