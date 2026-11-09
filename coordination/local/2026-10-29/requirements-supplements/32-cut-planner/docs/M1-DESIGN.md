# M1 interface decisions

Mode: Product App. The user prepares a finite cut list, then checks the exact allocation to each stock stick. Incorrect kerf or reusable-leftover assumptions are the primary risk. Always-visible content is the stock settings, required rows, build action and model limits; removal stays beside each row, and report actions follow the successful plan. FAQ details are secondary.

The desktop worksheet gives the plan three fifths of the workspace. The input column stays compact; both columns become one at the shared 48rem compact breakpoint. Each stock stick has an ordered piece list and separate numeric totals rather than a scaled drawing that could imply a real saw path. The stick index is operational ordering. No decorative charts, remote font or illustration is needed.

```text
Desktop: [ concise brand + language ]
         [ task title, mathematical assumptions ]
         [ stock + demand rows  | summary, balance       ]
         [ add / build / clear  | ordered stock articles ]
         [                      | copy / download / text ]
Mobile:  [ title + assumptions ]
         [ stock + demand rows ]
         [ build / clear       ]
         [ summary + sticks    ]
         [ report actions      ]
```

The palette uses unchanged family meanings: paper #f3f0e8, surface #ffffff, ink #111410, muted text #55594f, control border #60645c and acid #c8f56a for the primary build path. The system UI font handles labels and copy, with the family data stack reserved for measurements. There are no downloaded fonts. Spacing and radii use the family scale. The 2px ink / 6px acid focus treatment stays visible on all used surfaces. Controls target at least 44px.

Required states are represented in the implementation: disabled initialization, blank input, invalid input, successful bounded calculation, stale input, clipboard busy/denied/success, download failure/capacity limit, confirmation cancel/accept, and page lifecycle reset. Permission and OS behavior are distinct from application state.

Actual rendered desktop/mobile, keyboard, language and modal checks are **NOT_RUN_USER_FOCUS_INCIDENT**, as directed during M1. No browser/native/computer UI call was made in this chat. CSS/source inspection and offline state tests are not substitutes for those observations. Native 200% zoom, assistive technology, device/IME and complete Network/Storage remain unverified.

2026-10-19 update: the preceding paragraph records the original owner handoff. The primary subsequently performed isolated original-HTTP tests and focused retests, approving M1 with 69 PASS, 0 FAIL, 3 PARTIAL and 7 NOT_RUN. English persisted BFCache and both no-JavaScript cases passed; Traditional Chinese history reset had no persisted restore event and remains PARTIAL. Network/Storage partial/manual and native scopes remain explicit. The original owner still performed no UI automation. See PUBLIC-RELEASE.md for the current scoped approval.
