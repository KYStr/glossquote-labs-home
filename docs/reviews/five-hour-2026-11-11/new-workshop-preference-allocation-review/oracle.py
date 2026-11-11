"""Independent exact oracle for small, already validated workshop cases.

Enumerate every feasible assignment and choose the lexicographically smallest
rank tuple in input-row order. Compare that result with maximum cardinality
to detect an accidental global-optimality claim. No candidate code is used.
"""

from collections import Counter
from itertools import product


ASSIGNMENT_HEADER = "participant_id,workshop_id,status,preference_rank"
UNASSIGNED = 4


def exhaustive_assignment(workshops, participants):
    """Return the canonical ranks, workshop IDs and feasible maximum count."""
    if len(participants) > 9:
        raise ValueError("This exponential oracle is for small tests only")
    capacities = dict(workshops)
    choices = [
        tuple(enumerate(preferences, 1)) + ((UNASSIGNED, ""),)
        for _, preferences in participants
    ]
    best_ranks = None
    best_workshops = None
    max_assigned = 0
    for allocation in product(*choices):
        ranks, workshop_ids = zip(*allocation)
        used = Counter(workshop for workshop in workshop_ids if workshop)
        if any(used[workshop] > capacities[workshop] for workshop in used):
            continue
        max_assigned = max(max_assigned, sum(used.values()))
        if best_ranks is None or ranks < best_ranks:
            best_ranks, best_workshops = ranks, workshop_ids
    assert best_ranks is not None
    return best_ranks, best_workshops, max_assigned


def assignment_rows(participants, ranks, workshop_ids):
    rows = []
    for (participant, preferences), rank, workshop in zip(participants, ranks, workshop_ids, strict=True):
        if rank < UNASSIGNED:
            status = "assigned"
            rank_cell = str(rank)
        else:
            status = "choices_full" if preferences else "no_preference"
            rank_cell = ""
        rows.append((participant, workshop, status, rank_cell))
    return rows


def csv_bytes(rows):
    """All output fields in this grammar are comma-, quote- and newline-free ASCII."""
    return "\r\n".join([ASSIGNMENT_HEADER, *(",".join(row) for row in rows)]).encode("ascii")


def roster_bytes(rows, workshop):
    return csv_bytes(row for row in rows if row[1] == workshop and row[2] == "assigned")


def check_scenario(workshops, people, literal_rows, expected_usage, expected_max):
    ranks, assignment, maximum = exhaustive_assignment(workshops, people)
    rows = assignment_rows(people, ranks, assignment)
    assert rows == literal_rows, rows
    assert maximum == expected_max
    used = Counter(row[1] for row in rows if row[2] == "assigned")
    remaining = {workshop: capacity - used[workshop] for workshop, capacity in workshops}
    assert tuple((used[workshop], remaining[workshop]) for workshop, _ in workshops) == expected_usage
    assert sum(used.values()) + sum(row[2] != "assigned" for row in rows) == len(people)
    assert all(count >= 0 for count in remaining.values())
    return rows


def main():
    rooms = [("W1", 1), ("W2", 2)]
    original = [
        ("R01", ("W1", "W2")), ("R02", ("W1", "W2")), ("R03", ("W1",)),
        ("R04", ("W2",)), ("R05", ()),
    ]
    rows = check_scenario(rooms, original, [
        ("R01", "W1", "assigned", "1"), ("R02", "W2", "assigned", "2"),
        ("R03", "", "choices_full", ""), ("R04", "W2", "assigned", "1"),
        ("R05", "", "no_preference", ""),
    ], ((1, 0), (2, 0)), 3)
    assert roster_bytes(rows, "W2") == (
        b"participant_id,workshop_id,status,preference_rank\r\n"
        b"R02,W2,assigned,2\r\nR04,W2,assigned,1"
    )
    check_scenario(rooms, [original[2], *original[:2], *original[3:]], [
        ("R03", "W1", "assigned", "1"), ("R01", "W2", "assigned", "2"),
        ("R02", "W2", "assigned", "2"), ("R04", "", "choices_full", ""),
        ("R05", "", "no_preference", ""),
    ], ((1, 0), (2, 0)), 3)

    rooms = [("A", 1), ("B", 1)]
    flexible = [("Z", ("A", "B")), ("001", ("A",))]
    rows = check_scenario(rooms, flexible, [
        ("Z", "A", "assigned", "1"), ("001", "", "choices_full", ""),
    ], ((1, 0), (0, 1)), 2)
    assert roster_bytes(rows, "B") == b"participant_id,workshop_id,status,preference_rank"
    check_scenario(rooms, flexible[::-1], [
        ("001", "A", "assigned", "1"), ("Z", "B", "assigned", "2"),
    ], ((1, 0), (1, 0)), 2)

    rooms = [("b", 1), ("B", 1), ("C", 1)]
    rows = check_scenario(rooms, [
        ("Z9", ("B",)), ("A0", ("b",)), ("001", ("b", "B", "C")), ("E", ()),
    ], [
        ("Z9", "B", "assigned", "1"), ("A0", "b", "assigned", "1"),
        ("001", "C", "assigned", "3"), ("E", "", "no_preference", ""),
    ], ((1, 0), (1, 0), (1, 0)), 3)
    assert csv_bytes(rows) == (
        b"participant_id,workshop_id,status,preference_rank\r\n"
        b"Z9,B,assigned,1\r\nA0,b,assigned,1\r\n001,C,assigned,3\r\nE,,no_preference,"
    )
    print("5 small literal cases, 3 CSV byte checks, maximum-cardinality contrast and seat conservation: PASS")


if __name__ == "__main__":
    main()
