package com.flo.qushift.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@SuperBuilder
@Getter
@Setter
@NoArgsConstructor
public class Member {
    private String userId;

    private String username;

    private Boolean checkSeen = false;

    private Integer notSeenCount = 0;
}
