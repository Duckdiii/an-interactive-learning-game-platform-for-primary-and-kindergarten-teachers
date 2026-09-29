package com.aigameplatform.backend.entity.question;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spot_the_target_questions")
@Getter
@Setter
@NoArgsConstructor
public class SpotTheTargetQuestion extends QuestionGame {

    // AI chỉ mô tả vật cần tìm; ảnh nền nằm ở visualPrompt/imageUrl của QuestionGame.
    private String targetDescription;

    // Vùng đúng (đáp án), tỉ lệ 0-1 so với ảnh. null khi còn là bản nháp, giáo viên chạm ảnh để chọn.
    @Column(name = "hit_region_x")
    private Double hitRegionX;

    @Column(name = "hit_region_y")
    private Double hitRegionY;

    @Column(name = "hit_region_radius")
    private Double hitRegionRadius;
}
