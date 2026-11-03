window.__ModuleLoader__.load({
  id: '@local/app-motion',
  factory() {
    /** Swap the media feature, so a "reduce" answer reads as "no-preference" and the reverse. */
    const MOTION_QUERY = /prefers-reduced-motion\s*:\s*(reduce|no-preference)/g;
    /** Match only the blocks that switch motion off. */
    const REDUCE_CONDITION = /prefers-reduced-motion\s*:\s*reduce/;
    const MEDIA_RULE = 4;

    return {
      inject: [],
      apply(ctx) {
        ctx.effect(() => {
          /* 1. JavaScript motion checks: make matchMedia answer "motion is allowed". */
          const originalMatchMedia = window.matchMedia.bind(window);
          const patchedMatchMedia = (query) => originalMatchMedia(String(query).replace(
            MOTION_QUERY,
            (_, value) => 'prefers-reduced-motion: ' + (value === 'reduce' ? 'no-preference' : 'reduce'),
          ));
          window.matchMedia = patchedMatchMedia;

          /* 2. CSS motion: remove every reduced-motion block, and keep it for disposal. */
          const removed = [];

          const dropRules = (container) => {
            let rules;
            try { rules = container.cssRules } catch { return }
            for (let index = rules.length - 1; index >= 0; index -= 1) {
              const rule = rules[index];
              if (rule.type === MEDIA_RULE && REDUCE_CONDITION.test(rule.conditionText || '')) {
                removed.push({ container, index, text: rule.cssText });
                container.deleteRule(index);
                continue;
              }
              const children = rule.cssRules;
              if (!children || typeof rule.deleteRule !== 'function') continue;
              for (let childIndex = children.length - 1; childIndex >= 0; childIndex -= 1) {
                const child = children[childIndex];
                if (child.type !== MEDIA_RULE || !REDUCE_CONDITION.test(child.conditionText || '')) continue;
                removed.push({ container: rule, index: childIndex, text: child.cssText });
                rule.deleteRule(childIndex);
              }
            }
          };

          const sweep = () => {
            const visit = (root) => {
              for (const sheet of [...root.styleSheets, ...(root.adoptedStyleSheets || [])]) dropRules(sheet);
              for (const element of root.querySelectorAll('*')) {
                if (element.shadowRoot) visit(element.shadowRoot);
              }
            };
            visit(document);
          };

          const restore = () => {
            const groups = new Map();
            for (const item of removed) {
              const list = groups.get(item.container);
              if (list === undefined) groups.set(item.container, [item]);
              else list.push(item);
            }
            for (const [container, items] of groups) {
              items.sort((a, b) => a.index - b.index);
              for (const item of items) {
                try {
                  container.insertRule(item.text, Math.min(item.index, container.cssRules.length));
                } catch {
                  /* The sheet is gone, or the rule is no longer valid. */
                }
              }
            }
            removed.length = 0;
          };

          sweep();

          /* Stylesheets can arrive later: a lazy chunk, a panel, or another plugin. */
          const timers = [250, 1000, 3000].map((delay) => window.setTimeout(sweep, delay));
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.tagName === 'STYLE' || node.tagName === 'LINK' || node.shadowRoot || node.querySelector('style, link') !== null) {
                  sweep();
                  return;
                }
              }
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });

          return () => {
            observer.disconnect();
            for (const timer of timers) window.clearTimeout(timer);
            restore();
            if (window.matchMedia === patchedMatchMedia) window.matchMedia = originalMatchMedia;
          };
        }, 'app-motion: keep animations on');
      },
    };
  },
});
