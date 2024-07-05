import { filterTargetsByCountryAndExclusion } from "../../src/helpers/country_filter";
describe("filterTargetsByCountryAndExclusion", () => {
  const testCases: {
    targetArea: string | null;
    country: string | undefined;
    expected:
      | [
          {
            targetArea: string | null;
          },
        ]
      | [];
  }[] = [
    {
      targetArea: null,
      country: "JP",
      expected: [
        {
          targetArea: null,
        },
      ],
    },
    {
      targetArea: "",
      country: "JP",
      expected: [
        {
          targetArea: "",
        },
      ],
    },
    { targetArea: "JP", country: undefined, expected: [] },
    { targetArea: "JP", country: "JP", expected: [{ targetArea: "JP" }] },
    { targetArea: "NON-JP", country: "JP", expected: [] },
    {
      targetArea: "NON-JP",
      country: "US",
      expected: [{ targetArea: "NON-JP" }],
    },
    { targetArea: "JP,NON-JP", country: "JP", expected: [] },
    { targetArea: "US,NON-JP", country: "JP", expected: [] },
    {
      targetArea: "US,NON-JP",
      country: "US",
      expected: [{ targetArea: "US,NON-JP" }],
    },
    { targetArea: "US", country: "JP", expected: [] },
    {
      targetArea: "JP,NON-US,NON-ID",
      country: "JP",
      expected: [{ targetArea: "JP,NON-US,NON-ID" }],
    },
  ];

  testCases.forEach(({ targetArea, country, expected }, index) => {
    it(`should filter correctly (case ${index + 1})`, () => {
      const array = [{ targetArea }];
      const result = filterTargetsByCountryAndExclusion(array, country);
      expect(result).toEqual(expected);
    });
  });
});
