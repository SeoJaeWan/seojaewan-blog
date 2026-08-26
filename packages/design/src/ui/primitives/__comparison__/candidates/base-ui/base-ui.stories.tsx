import type { Meta, StoryObj } from "@storybook/react-vite";

import { PrimitiveComparisonFixture } from "../../fixtures";
import { candidate } from "./candidate";

import "./styles.css";

const BaseUiComparison = () => <PrimitiveComparisonFixture candidate={candidate} />;

const meta = {
  component: BaseUiComparison,
  parameters: {
    layout: "fullscreen",
  },
  title: "Primitives/Comparison/Base UI",
} satisfies Meta<typeof BaseUiComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProductionFixture: Story = {};
