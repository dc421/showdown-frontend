script setup>
defineProps({
  bases: Object,
  canSteal: Boolean, // New prop to control button visibility
});
const emit = defineEmits(['attempt-steal']);

const getLastName = (runner) => {
    if (!runner || !runner.name) return '';
    return runner.name.split(' ').pop();
}
</script>

<template>
  <div class="diamond-container">
    <svg viewBox="0 0 100 100">
    <polygon points="50,95 5,50 50,5 95,50" class="grass" />
      <path d="M 50 95 L 95 50 L 50 5 L 5 50 Z" class="base-path" />

      <rect x="47" y="89" width="6" height="6" class="base" transform="rotate(45 50 92)" />
      <rect x="89" y="47" width="6" height="6" class="base" />
      <rect x="47" y="5" width="6" height="6" class="base" />
      <rect x="5" y="47" width="6" height="6" class="base" />
      
      <g v-if="bases.third" class="runner-group">
        <circle cx="15" cy="50" r="5" class="runner" />
        <text x="15" y="50" class="runner-text">{{ bases.third.speed }}</text>
        <text x="15" y="42" class="runner-name">{{ getLastName(bases.third) }}</text>
      </g>
      <g v-if="bases.second" class="runner-group">
        <circle cx="50" cy="15" r="5" class="runner" />
        <text x="50" y="15" class="runner-text">{{ bases.second.speed }}</text>
        <text x="50" y="7" class="runner-name">{{ getLastName(bases.second) }}</text>
        <foreignObject x="35" y="22" width="30" height="15">
            <button v-if="canSteal" @click="emit('attempt-steal', 2)">Steal 3rd</button>
        </foreignObject>
      </g>
      <g v-if="bases.first" class="runner-group">
        <circle cx="85" cy="50" r="5" class="runner" />
        <text x="85" y="50" class="runner-text">{{ bases.first.speed }}</text>
        <text x="85" y="42" class="runner-name">{{ getLastName(bases.first) }}</text>
        <foreignObject x="70" y="57" width="30" height="15">
            <button v-if="canSteal" @click="emit('attempt-steal', 1)">Steal 2nd</button>
        </foreignObject>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.diamond-container { width: 200px; height: 200px; margin: 1rem auto; }
.grass { fill: #6b8e23; }
.base-path { fill: #c2b280; stroke: #a08f65; stroke-width: 1; }
.base { fill: white; }
.runner { fill: #007bff; stroke: white; stroke-width: 0.5; }
.runner-text { font-size: 5px; fill: white; text-anchor: middle; dominant-baseline: middle; font-weight: bold; }
.runner-name { font-size: 5px; text-anchor: middle; }
.runner-group button {
    width: 100%;
    height: 100%;
    font-size: 4px;
    padding: 0;
    cursor: pointer;
}
</style>