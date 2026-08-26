import type { Meta, StoryObj } from "@storybook/react-vite";

import { PRIMITIVE_COMPARISON_SCENARIOS, PrimitiveComparisonFixture } from "../../fixtures";
import { candidate } from ".";

const RadixComparison = () => <PrimitiveComparisonFixture candidate={candidate} />;

const meta = {
  parameters: {
    controls: { disable: true },
    primitiveComparison: {
      fixtureIds: PRIMITIVE_COMPARISON_SCENARIOS.map(({ id }) => id),
    },
  },
  title: "Primitives/Comparison/Radix",
  component: RadixComparison,
} satisfies Meta<typeof RadixComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SharedFixture: Story = {};
