import { createElement } from "react";

import { PrimitiveComparisonFixture } from "../../src/ui/primitives/__comparison__/fixtures";

import { candidate } from "#primitive-candidate";

export const renderPrimitiveComparison = () =>
  createElement(PrimitiveComparisonFixture, { candidate });
