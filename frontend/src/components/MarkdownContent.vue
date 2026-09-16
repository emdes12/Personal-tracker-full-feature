<script setup lang="ts">
import { computed } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{ content: string }>();

marked.setOptions({ breaks: true, gfm: true });

const html = computed(() => {
  const raw = marked.parse(props.content, { async: false }) as string;
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ["p", "strong", "em", "code", "pre", "ul", "ol", "li", "a", "h1", "h2", "h3", "blockquote", "br", "hr"], ALLOWED_ATTR: ["href", "target", "rel"] });
});
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style scoped>
.markdown-body :deep(p) {
  margin: 0 0 0.5em;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.25em 0 0.5em;
  padding-left: 1.25em;
}
.markdown-body :deep(li) {
  margin: 0.15em 0;
}
.markdown-body :deep(li p) {
  margin: 0;
}
.markdown-body :deep(strong) {
  font-weight: 600;
}
.markdown-body :deep(code) {
  background: rgb(0 0 0 / 0.06);
  border-radius: 0.25em;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}
.markdown-body :deep(pre) {
  background: rgb(0 0 0 / 0.06);
  border-radius: 0.5em;
  padding: 0.6em 0.8em;
  overflow-x: auto;
  margin: 0.5em 0;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}
.markdown-body :deep(a) {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-weight: 600;
  margin: 0.5em 0 0.25em;
}
.markdown-body :deep(h1) {
  font-size: 1.1em;
}
.markdown-body :deep(h2) {
  font-size: 1.05em;
}
.markdown-body :deep(h3) {
  font-size: 1em;
}
.markdown-body :deep(blockquote) {
  border-left: 2px solid rgb(0 0 0 / 0.15);
  padding-left: 0.75em;
  margin: 0.4em 0;
  opacity: 0.85;
}
</style>
