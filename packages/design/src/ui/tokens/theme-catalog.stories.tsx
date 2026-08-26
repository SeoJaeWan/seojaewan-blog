import type { Meta, StoryObj } from "@storybook/react-vite";

const Color = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-color">
    <h2 className="theme-catalog__section-title" id="theme-catalog-color">
      Color
    </h2>
    <div className="theme-catalog__swatch-grid">
      <div
        className="theme-catalog__swatch theme-catalog__swatch--window"
        data-token-probe="surface"
      >
        <code>var(--wd-color-surface-window)</code>
      </div>
      <div className="theme-catalog__swatch theme-catalog__swatch--panel">
        <code>var(--wd-color-surface-panel)</code>
      </div>
      <div className="theme-catalog__swatch theme-catalog__swatch--accent">
        <code>var(--wd-color-accent-default)</code>
      </div>
      <div className="theme-catalog__swatch theme-catalog__swatch--danger">
        <code>var(--wd-color-danger-surface)</code>
      </div>
    </div>
    <p className="theme-catalog__text-probe" data-token-probe="text">
      Primary text · <code>var(--wd-color-text-primary)</code>
    </p>
  </section>
);

const Spacing = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-spacing">
    <h2 className="theme-catalog__section-title" id="theme-catalog-spacing">
      Spacing
    </h2>
    <div className="theme-catalog__spacing-list">
      <span className="theme-catalog__spacing theme-catalog__spacing--1">
        <code>var(--wd-reference-spacing-1)</code>
      </span>
      <span className="theme-catalog__spacing theme-catalog__spacing--3">
        <code>var(--wd-reference-spacing-3)</code>
      </span>
      <span className="theme-catalog__spacing theme-catalog__spacing--6">
        <code>var(--wd-reference-spacing-6)</code>
      </span>
    </div>
  </section>
);

const Typography = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-typography">
    <h2 className="theme-catalog__section-title" id="theme-catalog-typography">
      Typography
    </h2>
    <p className="theme-catalog__type-sample" data-token-probe="typography">
      The quick brown fox · <code>var(--wd-font-family-sans)</code>
    </p>
  </section>
);

const Radius = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-radius">
    <h2 className="theme-catalog__section-title" id="theme-catalog-radius">
      Radius
    </h2>
    <div className="theme-catalog__sample-row">
      <span className="theme-catalog__radius theme-catalog__radius--1" data-token-probe="radius">
        <code>var(--wd-reference-radius-1)</code>
      </span>
      <span className="theme-catalog__radius theme-catalog__radius--2">
        <code>var(--wd-reference-radius-2)</code>
      </span>
      <span className="theme-catalog__radius theme-catalog__radius--3">
        <code>var(--wd-reference-radius-3)</code>
      </span>
    </div>
  </section>
);

const Shadow = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-shadow">
    <h2 className="theme-catalog__section-title" id="theme-catalog-shadow">
      Shadow
    </h2>
    <div className="theme-catalog__sample-row">
      <span className="theme-catalog__shadow theme-catalog__shadow--1" data-token-probe="shadow">
        <code>var(--wd-reference-shadow-1)</code>
      </span>
      <span className="theme-catalog__shadow theme-catalog__shadow--2">
        <code>var(--wd-reference-shadow-2)</code>
      </span>
    </div>
  </section>
);

const Motion = () => (
  <>
    <section className="theme-catalog__section" aria-labelledby="theme-catalog-duration">
      <h2 className="theme-catalog__section-title" id="theme-catalog-duration">
        Duration
      </h2>
      <div className="theme-catalog__sample-row">
        <span className="theme-catalog__motion theme-catalog__motion--quick">
          <code>var(--wd-reference-duration-120)</code>
        </span>
        <span
          className="theme-catalog__motion theme-catalog__motion--standard"
          data-token-probe="motion"
        >
          <code>var(--wd-reference-duration-200)</code>
        </span>
        <span className="theme-catalog__motion theme-catalog__motion--patient">
          <code>var(--wd-reference-duration-500)</code>
        </span>
      </div>
    </section>
    <section className="theme-catalog__section" aria-labelledby="theme-catalog-easing">
      <h2 className="theme-catalog__section-title" id="theme-catalog-easing">
        Easing
      </h2>
      <div className="theme-catalog__sample-row">
        <span className="theme-catalog__motion theme-catalog__motion--ease">
          <code>var(--wd-reference-easing-1)</code>
        </span>
        <span className="theme-catalog__motion theme-catalog__motion--enter">
          <code>var(--wd-reference-easing-3)</code>
        </span>
        <span className="theme-catalog__motion theme-catalog__motion--exit">
          <code>var(--wd-reference-easing-4)</code>
        </span>
      </div>
    </section>
  </>
);

const Components = () => (
  <section className="theme-catalog__section" aria-labelledby="theme-catalog-components">
    <h2 className="theme-catalog__section-title" id="theme-catalog-components">
      Component namespaces
    </h2>
    <div className="theme-catalog__component-grid">
      <article
        className="theme-catalog__component theme-catalog__component--window-frame"
        data-token-probe="window-frame"
      >
        <header className="theme-catalog__window-titlebar">Window Frame</header>
        <p className="theme-catalog__component-copy">
          <code>var(--wd-window-frame-root-background-color)</code>
        </p>
      </article>
      <article
        className="theme-catalog__component theme-catalog__component--taskbar"
        data-token-probe="taskbar"
      >
        <strong>Taskbar</strong>
        <code>var(--wd-taskbar-root-background-color)</code>
      </article>
      <article
        className="theme-catalog__component theme-catalog__component--window-panel"
        data-token-probe="window-panel"
      >
        <strong>Window Panel</strong>
        <code>var(--wd-window-panel-root-background-color)</code>
      </article>
    </div>
  </section>
);

const ThemeCatalog = () => (
  <main className="theme-catalog">
    <header className="theme-catalog__header">
      <p className="theme-catalog__eyebrow">Foundations</p>
      <h1 className="theme-catalog__title">Theme Catalog</h1>
      <p className="theme-catalog__intro">
        The single default theme exposed by the design package.
      </p>
    </header>
    <div className="theme-catalog__grid">
      <Color />
      <Spacing />
      <Typography />
      <Radius />
      <Shadow />
      <Motion />
      <Components />
    </div>
  </main>
);

const meta = {
  title: "Foundations/Theme Catalog",
  component: ThemeCatalog,
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
  },
} satisfies Meta<typeof ThemeCatalog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
