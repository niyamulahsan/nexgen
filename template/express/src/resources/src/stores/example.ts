// ./src/resources/src/stores/example.ts

import axios from "axios";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useExample = defineStore("example", () => {
  const index = async (params: { search?: string; page?: number; size?: number } = {}) => {
    // statement to indicate that the loading process has started
  };

  const show = async (id: number) => {
    // statement to indicate that the loading process has started
  };

  const store = async (payload: { name: string }) => {
    // statement to indicate that the loading process has started
  };

  const update = async (id: number, payload: { name: string }) => {
    // statement to indicate that the loading process has started
  };

  const destroy = async (ids: number | Array<string | number>) => {
    // statement to indicate that the loading process has started
  };

  return { index, show, store, update, destroy };
});
