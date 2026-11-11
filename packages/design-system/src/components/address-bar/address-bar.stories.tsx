import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, type JSX, useState } from 'react';
import { expect, fireEvent, fn, userEvent, within } from 'storybook/test';

import addressBarExport from '../../../figma/components/address-bar/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { ListItem } from '../list-item/list-item';
import { AddressBar } from './address-bar';

// 피그마 Suggestions 슬롯의 기본 내용이다(Compact ListItem 하나, 글 문서 아이콘).
const defaultSuggestions = <ListItem icon={<ImageAsset name="images/file-document" />} />;

// 피그마 AddressBar의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'focused', 'suggesting'] as const;

type FigmaArgs = {
  /** 피그마 Filled. 거짓이면 입력값을 비운다(코드는 값으로 정한다) */
  isFilled: boolean;
  /** 피그마 TEXT 속성 Placeholder */
  placeholder: string;
  /** 피그마 TEXT 속성 Query */
  query: string;
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 URL */
  url: string;
  /** 동작 스토리가 입력을 확인하려고 받는다 */
  onChange?: ComponentProps<typeof AddressBar>['onChange'];
};

/**
 * 입력창에서 선택된 글자를 돌려준다.
 * @param input 입력창
 * @returns 선택된 글자
 */
function selectedText(input: HTMLInputElement): string {
  return input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
}

const meta = {
  title: 'Components/AddressBar',
  // 글자는 피그마 URL·Query·Placeholder 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: {
    isFilled: true,
    placeholder: '글 검색 또는 URL 입력',
    query: '검색어',
    state: 'rest',
    url: '웹 주소',
  },
  argTypes: {
    isFilled: { control: 'boolean' },
    placeholder: { control: 'text' },
    query: { control: 'text' },
    state: { control: 'inline-radio', options: STATES },
    url: { control: 'text' },
  },
  // AddressBar는 너비를 갖지 않고 쓰는 곳이 정한다. FigmaFrame이 피그마 원본의 미리보기 너비로 감싼다.
  decorators: [figmaFrame(addressBarExport)],
  render: (args) => {
    const { onChange: handleChange } = args;
    const bar = (
      <AddressBar
        // 상태나 글자를 바꾸면 처음 값부터 다시 그리도록 key를 바꾼다.
        key={`${args.state}-${String(args.isFilled)}-${args.url}-${args.query}`}
        aria-label="주소"
        url={args.isFilled ? args.url : ''}
        query={args.isFilled ? args.query : ''}
        placeholder={args.placeholder}
        isSuggesting={args.state === 'suggesting'}
        suggestions={defaultSuggestions}
        onChange={handleChange}
      />
    );
    // Suggesting은 카드가 입력 줄 위로 떠 있어 바깥 상자가 피그마 변형 노드(카드)와 다르다. 카드를 기준으로 지정한다([[피그마 연동:스토리 규칙]]).
    return args.state === 'suggesting' ? (
      <div data-parity-target data-parity-box='[data-slot="suggestions-card"]'>
        {bar}
      </div>
    ) : (
      bar
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[Chrome:주소창]]
export const Default: Story = {
  args: { url: 'seojaewan.com', onChange: fn() },
  play: async ({ args, canvasElement, step }) => {
    const input = within(canvasElement).getByRole<HTMLInputElement>('textbox', { name: '주소' });

    // @codocs [[Chrome:주소창]]
    await step('평소에는 url을 보여 준다', async () => {
      await expect(input).toHaveValue('seojaewan.com');
    });

    // @codocs [[Chrome:주소창]]
    // 합성 클릭(userEvent.click)은 눌린 자리에 커서를 놓아 선택을 풀므로, 실제 누름 순서를 이벤트로 보낸다.
    await step(
      '클릭하면 주소 전체가 선택되고, 포커스를 준 누름의 mouseup은 선택을 풀지 못하게 막는다',
      async () => {
        await fireEvent.mouseDown(input);
        input.focus();
        await expect(input).toHaveFocus();
        await expect(selectedText(input)).toBe('seojaewan.com');
        // dispatchEvent가 false를 돌려주면 preventDefault가 불렸다는 뜻이다.
        await expect(await fireEvent.mouseUp(input)).toBe(false);
        await expect(selectedText(input)).toBe('seojaewan.com');
      },
    );

    // @codocs [[Chrome:주소창]]
    await step('Tab으로 포커스를 받아도 주소 전체가 선택된다', async () => {
      input.blur();
      await userEvent.tab();
      await expect(input).toHaveFocus();
      await expect(selectedText(input)).toBe('seojaewan.com');
    });

    // @codocs [[Chrome:주소창]]
    await step('입력하면 onChange를 부른다', async () => {
      await userEvent.clear(input);
      await userEvent.type(input, '리액트');
      await expect(input).toHaveValue('리액트');
      await expect(args.onChange).toHaveBeenCalled();
    });
  },
};

// @codocs [[Chrome:주소창]]
export const Suggesting: Story = {
  args: { state: 'suggesting', url: 'seojaewan.com', query: '리액트' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[Chrome:주소창]]
    await step('추천 목록이 열린 동안에는 query를 보여 준다', async () => {
      await expect(within(canvasElement).getByRole('textbox', { name: '주소' })).toHaveValue(
        '리액트',
      );
    });

    // @codocs [[Chrome:주소창]]
    await step('추천 자리에 넣은 내용을 입력 줄 아래 카드에 보인다', async () => {
      await expect(within(canvasElement).getByText('항목 이름')).toBeVisible();
    });
  },
};

/**
 * 입력하면 Suggesting을 켜는 주소창이다. 켜질 때 입력칸이 같은 요소로 남는지 본다.
 * @returns 주소창
 */
function SuggestOnInput(): JSX.Element {
  const [isSuggesting, setIsSuggesting] = useState(false);
  return (
    <AddressBar
      aria-label="주소"
      url="seojaewan.com"
      isSuggesting={isSuggesting}
      suggestions={defaultSuggestions}
      onChange={() => {
        setIsSuggesting(true);
      }}
    />
  );
}

// @codocs [[Chrome:주소창]]
export const KeepsInputWhileSuggesting: Story = {
  render: () => <SuggestOnInput />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: '주소' });

    // @codocs [[Chrome:주소창]]
    await step('입력해 추천이 열려도 입력칸이 같은 요소로 남아 포커스를 잃지 않는다', async () => {
      await userEvent.click(input);
      await userEvent.keyboard('a');
      await expect(canvas.getByText('항목 이름')).toBeVisible();
      await expect(canvas.getByRole('textbox', { name: '주소' })).toBe(input);
      await expect(input).toHaveFocus();
    });
  },
};

/**
 * 지금 보이는 앞 아이콘의 viewBox를 돌려준다. 돋보기(Material 20)는 `0 0 20 20`, 사이트 정보(Fluent 24)는 `0 0 24 24`다.
 * @param canvasElement 스토리 캔버스
 * @returns 보이는 아이콘의 viewBox
 */
function visibleIconViewBox(canvasElement: HTMLElement): string | null {
  const icons = [...canvasElement.querySelectorAll('svg')].filter(
    (icon) => getComputedStyle(icon).display !== 'none',
  );
  return icons.length === 1 ? (icons[0]?.getAttribute('viewBox') ?? null) : null;
}

// @codocs [[Chrome:주소창]]
export const Empty: Story = {
  args: { isFilled: false },
  play: async ({ canvasElement, step }) => {
    const input = within(canvasElement).getByRole<HTMLInputElement>('textbox', { name: '주소' });

    // @codocs [[Chrome:주소창]]
    await step('비어 있으면 안내 문구와 돋보기를 보인다', async () => {
      await expect(input).toHaveValue('');
      await expect(input).toHaveAttribute('placeholder', '글 검색 또는 URL 입력');
      await expect(visibleIconViewBox(canvasElement)).toBe('0 0 20 20');
    });

    // @codocs [[Chrome:주소창]]
    await step('입력하면 사이트 정보 아이콘으로 돌아간다', async () => {
      await userEvent.type(input, 'seojaewan.com');
      await expect(visibleIconViewBox(canvasElement)).toBe('0 0 24 24');
    });
  },
};
