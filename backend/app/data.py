"""
GRIDMIND Coimbatore static data.

Traffic values and energy consumption figures are illustrative
academic prototype data, not live municipal or electricity-board readings.
"""

BASE_SEGMENTS = [
    {
        "id": "avinashi",
        "name": "Avinashi Road",
        "level": "high",
        "speed": 18,
        "coords": [
            [11.0188, 77.0090],
            [11.0208, 77.0250],
            [11.0220, 77.0410],
            [11.0240, 77.0570],
        ],
    },
    {
        "id": "trichy",
        "name": "Trichy Road",
        "level": "medium",
        "speed": 32,
        "coords": [
            [10.9990, 77.0120],
            [11.0005, 77.0300],
            [11.0020, 77.0470],
        ],
    },
    {
        "id": "mettupalayam",
        "name": "Mettupalayam Road",
        "level": "low",
        "speed": 46,
        "coords": [
            [11.0160, 76.9550],
            [11.0250, 76.9660],
            [11.0350, 76.9780],
        ],
    },
    {
        "id": "sathy",
        "name": "Sathy Road",
        "level": "medium",
        "speed": 29,
        "coords": [
            [11.0180, 76.9750],
            [11.0250, 76.9900],
            [11.0310, 77.0060],
        ],
    },
    {
        "id": "pollachi",
        "name": "Pollachi Road",
        "level": "low",
        "speed": 42,
        "coords": [
            [10.9750, 76.9650],
            [10.9870, 76.9780],
            [10.9980, 76.9910],
        ],
    },
]


ENERGY_ZONES = [
    {
        "id": "central",
        "name": "Central Coimbatore",
        "usage_kwh": 18400,
        "capacity_kwh": 24000,
        "status": "Normal",
        "trend": "+3.2%",
    },
    {
        "id": "peelamedu",
        "name": "Peelamedu",
        "usage_kwh": 22100,
        "capacity_kwh": 26000,
        "status": "High load",
        "trend": "+8.1%",
    },
    {
        "id": "singanallur",
        "name": "Singanallur",
        "usage_kwh": 14600,
        "capacity_kwh": 21000,
        "status": "Normal",
        "trend": "+1.4%",
    },
    {
        "id": "gandhipuram",
        "name": "Gandhipuram",
        "usage_kwh": 19800,
        "capacity_kwh": 25000,
        "status": "Normal",
        "trend": "-0.8%",
    },
    {
        "id": "kuniyamuthur",
        "name": "Kuniyamuthur",
        "usage_kwh": 12900,
        "capacity_kwh": 19000,
        "status": "Normal",
        "trend": "+2.0%",
    },
]