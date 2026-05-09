<!-- aroma-admin/src/components/product/StepVariants.vue -->
<template>
  <div class="space-y-4">

    <!-- Page-level error -->
    <div v-if="pageError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ pageError }}
    </div>

    <!-- ══════════════════════════════
         WIZARD MODE — no variants yet
    ══════════════════════════════ -->
    <template v-if="!hasVariants">

      <!-- Step indicators (inner wizard) -->
      <div class="flex items-stretch gap-2">
        <div v-for="s in [1,2,3]" :key="s"
          :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', wizardStepClass(s)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', wizardNumClass(s)]">
            <Check v-if="currentWizardStep > s" :size="10" />
            <span v-else>{{ s }}</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="s === 1 && currentWizardStep > 1">
              <span v-if="productType === 'single'" class="text-emerald-400">{{ t('productVariants.singlePriceDone') }}</span>
              <span v-else class="text-emerald-400">{{ t('productVariants.multiVariantsDone') }}</span>
            </span>
            <span v-else-if="s === 2 && currentWizardStep > 2" class="text-emerald-400">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }} generated</span>
            <span v-else-if="s === 1">{{ t('productVariants.productType') }}</span>
            <span v-else-if="s === 2">{{ t('productVariants.step2') }}</span>
            <span v-else>{{ t('productVariants.setPrices') }}</span>
          </div>
        </div>
      </div>

      <!-- Wizard Step 1: single vs multi -->
      <div v-if="currentWizardStep === 1" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">{{ t('productVariants.step1Title') }}</h2>
        <p class="text-2xs text-dash-muted mb-4">{{ t('productVariants.howDoesItWork') }}</p>
        <div class="space-y-3">
          <label
            v-for="opt in [{ val: 'single', labelKey: 'productVariants.singlePrice', descKey: 'productVariants.singlePriceDesc' }, { val: 'multi', labelKey: 'productVariants.multipleVariants', descKey: 'productVariants.multipleVariantsDesc' }]"
            :key="opt.val"
            class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === opt.val ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'"
          >
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === opt.val ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === opt.val" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" :value="opt.val" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">{{ t(opt.labelKey) }}</p>
              <p class="text-2xs text-dash-muted mt-0.5">{{ t(opt.descKey) }}</p>
            </div>
          </label>
        </div>
        <div class="flex justify-end mt-5">
          <AButton size="sm" :disabled="!productType" :loading="generatingSingle" @click="handleWizardStep1">
            {{ t('productVariants.continueBtn') }}
          </AButton>
        </div>
      </div>

      <!-- Wizard Step 2: define specs (multi only) -->
      <div v-if="currentWizardStep === 2" class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.step2Title') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productVariants.step2Desc') }}</p>
        </div>
        <div>
          <p class="text-xs font-medium text-dash-text mb-2">{{ t('productVariants.specTypes') }}</p>
          <div class="flex gap-2">
            <select v-model="specToAdd"
              class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
              <option value="">{{ t('productVariants.addSpecType') }}</option>
              <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
              </option>
            </select>
            <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">{{ t('common.add') }}</AButton>
          </div>
          <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
            <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
              class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-dash-text flex-1">
                  {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                </span>
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)"><ChevronUp :size="12" /></button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)"><ChevronDown :size="12" /></button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)"><X :size="12" /></button>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5"><X :size="10" /></button>
                </span>
              </div>
              <div class="flex gap-2">
                <input v-model="valueInputs[spec.spec_type_id]" type="text"
                  :placeholder="`Add ${spec.name} value…`"
                  :class="['flex-1 rounded-btn border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none transition-colors',
                    spec.values.length === 0 ? 'border-dash-danger/60 focus:border-dash-danger' : 'border-dash-border focus:border-dash-primary']"
                  @keydown.enter.prevent="addValue(spec)" />
                <AButton size="sm" variant="secondary" @click="addValue(spec)">{{ t('common.add') }}</AButton>
              </div>
              <p v-if="spec.values.length === 0" class="mt-1 text-2xs text-dash-danger">{{ t('productVariants.atLeastOneValue') }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-dash-border">
          <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
            {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
          </p>
          <p v-else-if="assignedSpecs.length" class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
          <p v-else class="text-xs text-dash-muted">{{ t('productVariants.addAtLeastOneSpec') }}</p>
          <AButton size="sm" :loading="generating" :disabled="!specsValid || !assignedSpecs.length" @click="handleGenerate()">
            <Zap :size="13" /> {{ t('productVariants.generateVariants') }}
          </AButton>
        </div>
      </div>

      <!-- Wizard Step 3: prices -->
      <div v-if="currentWizardStep === 3" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">
          {{ productType === 'single' ? t('productVariants.step3TitleSingle') : t('productVariants.step3TitleMulti') }}
        </h2>
        <p class="text-2xs text-dash-muted mb-4">
          {{ productType === 'single' ? t('productVariants.step3DescSingle') : t('productVariants.step3DescMulti') }}
        </p>
        <!-- Single -->
        <div v-if="productType === 'single'" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>
        <!-- Multi table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('stepper.variantImages') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, ri) in priceRows" :key="row.id">
                <tr class="border-b border-dash-border/50" :class="expandedVariantImages === row.id ? '' : 'last:border-0'">
                  <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.price" type="number" step="0.01" min="0"
                      :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                        priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                    <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">{{ t('common.fieldRequired') }}</p>
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.originalPrice" type="number" step="0.01" min="0" placeholder="—"
                      class="w-24 px-2 py-1 rounded-btn border border-dash-border/50 text-xs bg-dash-bg text-dash-faint focus:outline-none focus:border-dash-border" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.quantity" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.lowStockThreshold" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-2">
                    <button class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="expandedVariantImages = expandedVariantImages === row.id ? null : row.id">
                      <span v-if="variantImageCounts[row.id]">{{ variantImageCounts[row.id] }} img</span>
                      <span v-else>{{ t('stepper.addVariantImages') }}</span>
                    </button>
                  </td>
                  <td class="py-1.5 px-2">
                    <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                      class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                    <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                  </td>
                </tr>
                <!-- Expanded variant image panel -->
                <tr v-if="expandedVariantImages === row.id" :key="`img-${row.id}`" class="border-b border-dash-border/50">
                  <td colspan="7" class="px-2 pb-1">
                    <VariantImagePanel
                      :productId="productId"
                      :variantId="row.id"
                      @update:imageCount="(n) => variantImageCounts[row.id] = n"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <!-- Single variant image panel -->
        <div v-if="productType === 'single' && priceRows.length > 0" class="mb-4">
          <VariantImagePanel
            :productId="productId"
            :variantId="priceRows[0].id"
            @update:imageCount="(n) => variantImageCounts[priceRows[0].id] = n"
          />
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>{{ t('productVariants.overallStock') }}</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">
            {{ productType === 'multi' ? t('productVariants.savePricesBtn') : t('productVariants.saveSingleBtn') }}
          </AButton>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════
         EDITING MODE — variants exist
    ══════════════════════════════ -->
    <template v-else>
      <!-- Specs summary (multi-variant) -->
      <div v-if="variants.length > 1" class="bg-dash-surface rounded-card shadow-card">
        <div class="flex items-center justify-between px-5 py-3">
          <div>
            <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.specsSection') }}
              <span class="font-normal text-dash-muted text-xs">· {{ variants.length }} combinations</span>
            </h2>
          </div>
          <AButton size="sm" variant="secondary" @click="editSpecsExpanded = !editSpecsExpanded">
            {{ editSpecsExpanded ? t('productVariants.collapse') : t('productVariants.editSpecs') }}
          </AButton>
        </div>
        <div v-if="editSpecsExpanded" class="px-5 pb-5 space-y-5">
          <!-- same spec definition UI as wizard step 2 -->
          <div>
            <div class="flex gap-2">
              <select v-model="specToAdd"
                class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary">
                <option value="">{{ t('productVariants.addSpecType') }}</option>
                <option v-for="s in availableSpecTypes" :key="s.id" :value="s.id">
                  {{ s.name }}{{ s.unit ? ` (${s.unit})` : '' }}
                </option>
              </select>
              <AButton size="sm" variant="secondary" :disabled="!specToAdd" @click="addSpec">{{ t('common.add') }}</AButton>
            </div>
            <div v-if="assignedSpecs.length" class="mt-3 space-y-2">
              <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
                class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs font-semibold text-dash-text flex-1">{{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}</span>
                  <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)"><ChevronUp :size="12" /></button>
                  <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)"><ChevronDown :size="12" /></button>
                  <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)"><X :size="12" /></button>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  <span v-for="(val, vi) in spec.values" :key="vi"
                    class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                    {{ val }}{{ spec.unit ?? '' }}
                    <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5"><X :size="10" /></button>
                  </span>
                </div>
                <div class="flex gap-2">
                  <input v-model="valueInputs[spec.spec_type_id]" type="text"
                    :placeholder="`Add ${spec.name} value…`"
                    class="flex-1 rounded-btn border border-dash-border bg-dash-bg px-3 py-1.5 text-xs text-dash-text focus:outline-none focus:border-dash-primary"
                    @keydown.enter.prevent="addValue(spec)" />
                  <AButton size="sm" variant="secondary" @click="addValue(spec)">{{ t('common.add') }}</AButton>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between pt-3 mt-3 border-t border-dash-border">
              <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
                {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
              </p>
              <p v-else class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
              <AButton size="sm" variant="danger" :loading="generating" :disabled="!specsValid || !assignedSpecs.length" @click="handleGenerate(true)">
                <Zap :size="13" /> {{ t('productVariants.regenerateVariants') }}
              </AButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing table (edit mode) -->
      <div class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-4">{{ t('productVariants.pricesAndStock') }}</h2>
        <!-- Single edit -->
        <div v-if="variants.length === 1" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>
        <div v-if="variants.length === 1" class="mb-4">
          <VariantImagePanel :productId="productId" :variantId="priceRows[0].id"
            @update:imageCount="(n) => variantImageCounts[priceRows[0].id] = n" />
        </div>
        <!-- Multi edit table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('stepper.variantImages') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, ri) in priceRows" :key="row.id">
                <tr class="border-b border-dash-border/50">
                  <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.price" type="number" step="0.01" min="0"
                      :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                        priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.originalPrice" type="number" step="0.01" min="0" placeholder="—"
                      class="w-24 px-2 py-1 rounded-btn border border-dash-border/50 text-xs bg-dash-bg text-dash-faint focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.quantity" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-1">
                    <input v-model="row.lowStockThreshold" type="number" min="0"
                      class="w-16 px-2 py-1 rounded-btn border border-dash-border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary" />
                  </td>
                  <td class="py-1.5 px-2">
                    <button class="text-2xs text-dash-muted hover:text-dash-primary transition-colors"
                      @click="expandedVariantImages = expandedVariantImages === row.id ? null : row.id">
                      <span v-if="variantImageCounts[row.id]">{{ variantImageCounts[row.id] }} img</span>
                      <span v-else>{{ t('stepper.addVariantImages') }}</span>
                    </button>
                  </td>
                  <td class="py-1.5 px-2">
                    <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                      class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                      @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                    <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                  </td>
                </tr>
                <tr v-if="expandedVariantImages === row.id" :key="`img-${row.id}`" class="border-b border-dash-border/50">
                  <td colspan="7" class="px-2 pb-1">
                    <VariantImagePanel :productId="productId" :variantId="row.id"
                      @update:imageCount="(n) => variantImageCounts[row.id] = n" />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>{{ t('productVariants.overallStock') }}</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">{{ t('productVariants.savePricesBtn') }}</AButton>
        </div>
      </div>

      <!-- Regenerate confirm dialog -->
      <AConfirmDialog
        :open="showRegenerateConfirm"
        :title="t('productVariants.regenerateConfirmTitle')"
        :message="t('productVariants.regenerateConfirmMessage', [variants.length])"
        :loading="generating"
        @confirm="doGenerate(true)"
        @cancel="showRegenerateConfirm = false"
      />
    </template>

    <!-- Bottom nav -->
    <div class="flex items-center justify-between pt-2">
      <AButton size="sm" variant="secondary" @click="emit('back')">{{ t('stepper.back') }}</AButton>
      <AButton size="sm" @click="emit('done')">{{ t('stepper.saveChanges') }}</AButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X, ChevronUp, ChevronDown, Zap } from 'lucide-vue-next'
import {
  apiGetVariants, apiBulkUpdateVariants, apiSetDefaultVariant,
  apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants, apiGetSpecTypes,
} from '../../api/admin'
import type { ProductVariant, SpecType, ProductSpec } from '../../types'
import AButton        from '../ui/AButton.vue'
import AInput         from '../ui/AInput.vue'
import ABadge         from '../ui/ABadge.vue'
import AConfirmDialog from '../ui/AConfirmDialog.vue'
import VariantImagePanel from './VariantImagePanel.vue'

const props = defineProps<{ productId: number }>()
const emit  = defineEmits<{ back: []; done: [] }>()

const { t } = useI18n()

// ── Variants ─────────────────────────────────────────────────────────────────
const variants    = ref<ProductVariant[]>([])
const pageError   = ref('')
const hasVariants = computed(() => variants.value.length > 0)

// ── Wizard state ──────────────────────────────────────────────────────────────
const currentWizardStep  = ref(1)
const productType        = ref<'single' | 'multi' | ''>('')
const generatingSingle   = ref(false)

// ── Spec state ────────────────────────────────────────────────────────────────
interface AssignedSpec { spec_type_id: number; name: string; unit: string | null; values: string[] }
const allSpecTypes    = ref<SpecType[]>([])
const assignedSpecs   = ref<AssignedSpec[]>([])
const specToAdd       = ref<number | ''>('')
const valueInputs     = ref<Record<number, string>>({})
const generating      = ref(false)
const editSpecsExpanded      = ref(false)
const showRegenerateConfirm  = ref(false)

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() =>
  assignedSpecs.value.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1)
)

const specsValid = computed(() =>
  assignedSpecs.value.length > 0 && assignedSpecs.value.every(s => s.values.length > 0)
)

function addSpec() {
  const id = Number(specToAdd.value)
  const st = allSpecTypes.value.find(s => s.id === id)
  if (!st) return
  assignedSpecs.value.push({ spec_type_id: st.id, name: st.name, unit: st.unit, values: [] })
  specToAdd.value = ''
}

function removeSpec(idx: number) { assignedSpecs.value.splice(idx, 1) }

function moveSpec(idx: number, dir: -1 | 1) {
  const arr = assignedSpecs.value
  const ni = idx + dir
  if (ni < 0 || ni >= arr.length) return
  ;[arr[idx], arr[ni]] = [arr[ni], arr[idx]]
}

function addValue(spec: AssignedSpec) {
  const v = (valueInputs.value[spec.spec_type_id] ?? '').trim()
  if (!v || spec.values.includes(v)) return
  spec.values.push(v)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: AssignedSpec, vi: number) { spec.values.splice(vi, 1) }

async function handleGenerate(force = false) {
  if (!force && hasVariants.value) { showRegenerateConfirm.value = true; return }
  await doGenerate(force)
}

async function doGenerate(force: boolean) {
  showRegenerateConfirm.value = false
  generating.value = true
  try {
    await apiSaveProductSpecs(props.productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const { data } = await apiGenerateVariants(props.productId, force)
    variants.value      = data
    currentWizardStep.value = 3
    initPriceRows(data)
  } catch { pageError.value = 'Failed to generate variants.' } finally {
    generating.value = false
  }
}

// ── Price rows ────────────────────────────────────────────────────────────────
interface PriceRow { id: number; price: string; originalPrice: string; quantity: string; lowStockThreshold: string }
const priceRows      = ref<PriceRow[]>([])
const priceRowErrors = ref<Record<number, { price?: string }>>({})
const savingPrices   = ref(false)

const expandedVariantImages  = ref<number | null>(null)
const variantImageCounts     = ref<Record<number, number>>({})

function initPriceRows(vs: ProductVariant[]) {
  priceRows.value = vs.map(v => ({
    id:               v.id,
    price:            v.price,
    originalPrice:    v.originalPrice ?? '',
    quantity:         String(v.quantity),
    lowStockThreshold: String(v.lowStockThreshold),
  }))
}

function variantLabel(id: number): string {
  const v = variants.value.find(v => v.id === id)
  if (!v) return String(id)
  return v.specs.map(s => `${s.value}${s.unit ?? ''}`).join(' / ') || 'Default'
}

const overallStockPreview = computed(() => {
  const total = priceRows.value.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
  const low   = priceRows.value.some(r => {
    const q = Number(r.quantity) || 0
    const thresh = Number(r.lowStockThreshold) || 0
    return q > 0 && q <= thresh
  })
  if (total === 0) return 'out_of_stock'
  if (low) return 'low_stock'
  return 'in_stock'
})

async function savePrices() {
  priceRowErrors.value = {}
  let valid = true
  priceRows.value.forEach((r, i) => {
    if (!r.price || Number(r.price) <= 0) { priceRowErrors.value[i] = { price: t('common.fieldRequired') }; valid = false }
  })
  if (!valid) return
  savingPrices.value = true
  try {
    await apiBulkUpdateVariants(props.productId, priceRows.value.map(r => ({
      id:                  r.id,
      price:               Number(r.price),
      original_price:      r.originalPrice ? Number(r.originalPrice) : null,
      quantity:            Number(r.quantity) || 0,
      low_stock_threshold: Number(r.lowStockThreshold) || 0,
    })))
    emit('done')
  } catch { pageError.value = 'Failed to save. Please try again.' } finally {
    savingPrices.value = false
  }
}

async function setDefault(variantId: number) {
  try {
    await apiSetDefaultVariant(props.productId, variantId)
    variants.value.forEach(v => { v.isDefault = v.id === variantId })
  } catch { /* silent */ }
}

// ── Wizard step 1 ─────────────────────────────────────────────────────────────
async function handleWizardStep1() {
  if (productType.value === 'single') {
    generatingSingle.value = true
    try {
      const { data } = await apiGenerateVariants(props.productId, false)
      variants.value = data
      initPriceRows(data)
      currentWizardStep.value = 3
    } catch { pageError.value = 'Failed to create variant.' } finally {
      generatingSingle.value = false
    }
  } else {
    currentWizardStep.value = 2
  }
}

function wizardStepClass(s: number) {
  if (currentWizardStep.value > s) return 'border-emerald-500/30 bg-emerald-500/5'
  if (currentWizardStep.value === s) return 'border-dash-primary/30 bg-dash-primary-lt/20'
  return 'border-dash-border opacity-50'
}

function wizardNumClass(s: number) {
  if (currentWizardStep.value > s) return 'bg-emerald-500 text-white'
  if (currentWizardStep.value === s) return 'bg-dash-primary text-white'
  return 'bg-dash-border text-dash-muted'
}

// ── Mount ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [vs, st, ps] = await Promise.all([
      apiGetVariants(props.productId),
      apiGetSpecTypes(),
      apiGetProductSpecs(props.productId),
    ])
    variants.value    = vs.data
    allSpecTypes.value = st.data
    if (vs.data.length > 0) {
      initPriceRows(vs.data)
      // pre-populate assignedSpecs from existing specs
      assignedSpecs.value = (ps.data.specs as ProductSpec[]).map((sp) => ({
        spec_type_id: sp.spec_type_id,
        name:         sp.name,
        unit:         sp.unit,
        values:       sp.values.map((v) => v.value),
      }))
    }
  } catch { pageError.value = 'Failed to load variants.' }
})
</script>
