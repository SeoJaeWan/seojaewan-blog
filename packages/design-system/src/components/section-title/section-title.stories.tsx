import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import sectionTitleExport from '../../../figma/components/section-title/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { SectionTitle } from './section-title';

const meta = {
  title: 'Components/SectionTitle',
  // 변형 속성이 없다. 글자는 피그마 Title 속성의 기본값이다.
  // 부모가 너비를 정하는 컴포넌트라 FigmaFrame이 피그마 원본 너비로 감싼다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
  decorators: [figmaFrame(sectionTitleExport)],
  render: () => <SectionTitle />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};

// @codocs [[접근성:영역 이름]]
/** 제목은 제목 태그로 그리고 영역이 가리킬 id를 받는다 */
export const Heading: Story = {
  render: () => <SectionTitle title="고정됨" titleId="section-title" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { name: '고정됨' })).toHaveAttribute(
      'id',
      'section-title',
    );
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** showAction이 꺼져 있으면 action을 그리지 않는다 */
export const Default: Story = {
  render: () => <SectionTitle title="고정됨" action={<button type="button">보기</button>} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('title로 바꾼 글자를 그린다', async () => {
      await expect(canvas.getByText('고정됨')).toBeInTheDocument();
    });

    await step('action을 그리지 않는다', async () => {
      await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** showAction이 켜지면 action을 그린다 */
export const WithAction: Story = {
  render: () => <SectionTitle showAction action={<button type="button">보기</button>} />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('action을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '보기' })).toBeInTheDocument();
    });
  },
};
