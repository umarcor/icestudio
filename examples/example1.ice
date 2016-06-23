{
  "board": "icezum",
  "graph": {
    "blocks": [
      {
        "id": "2e684aab-9f39-47a1-9af0-25969a6a908f",
        "type": "basic.code",
        "data": {
          "code": "// Driver low\n\nassign v = 1'b0;",
          "ports": {
            "in": [],
            "out": [
              "v"
            ]
          }
        },
        "position": {
          "x": 100,
          "y": 100
        }
      },
      {
        "id": "2d811451-4777-4f7b-9da2-67bb9bb9a71e",
        "type": "basic.output",
        "data": {
          "label": "o",
          "pin": {
            "name": "LED0",
            "value": 95
          }
        },
        "position": {
          "x": 627,
          "y": 165
        }
      }
    ],
    "wires": [
      {
        "source": {
          "block": "2e684aab-9f39-47a1-9af0-25969a6a908f",
          "port": "v"
        },
        "target": {
          "block": "2d811451-4777-4f7b-9da2-67bb9bb9a71e",
          "port": "in"
        }
      }
    ]
  },
  "deps": {}
}