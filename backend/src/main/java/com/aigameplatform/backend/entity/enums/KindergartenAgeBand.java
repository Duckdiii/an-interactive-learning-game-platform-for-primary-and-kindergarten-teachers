package com.aigameplatform.backend.entity.enums;

/** Age bands used by the preschool curriculum corpus; deliberately outside DSL v1.0.0. */
public enum KindergartenAgeBand {
    AGE_3_4("AGE_3_4"),
    AGE_4_5("AGE_4_5"),
    AGE_5_6("AGE_5_6");

    private final String metadataValue;

    KindergartenAgeBand(String metadataValue) {
        this.metadataValue = metadataValue;
    }

    public String metadataValue() {
        return metadataValue;
    }
}
