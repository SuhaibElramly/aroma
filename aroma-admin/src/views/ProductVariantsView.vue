<template>
  <div class="space-y-4 max-w-4xl">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs">
      <RouterLink to="/products" class="text-dash-faint hover:text-dash-text transition-colors">{{ t('nav.products') }}</RouterLink>
      <span class="text-dash-border">/</span>
      <span class="text-dash-text font-medium">{{ t('productVariants.variantsAndImages') }}</span>
    </div>

    <!-- Page-level error banner -->
    <div v-if="pageError" class="rounded-card bg-dash-danger-lt border border-dash-danger/20 px-4 py-3 text-xs text-dash-danger">
      {{ pageError }}
    </div>

    <!-- ── Images card (always shown, collapsible) ── -->
    <div class="bg-dash-surface rounded-card shadow-card">
      <!-- Collapsed header -->
      <div class="flex items-center justify-between px-5 py-3">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.imagesSection') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">
            {{ imagesExpanded ? t('productVariants.clickToSetThumbnail') : `${images.length} image${images.length !== 1 ? 's' : ''} uploaded` }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label v-if="imagesExpanded" class="cursor-pointer">
            <input type="file" accept="image/*" multiple class="sr-only" @change="handleUpload" :disabled="uploading" />
            <span :class="['inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-all duration-200',
              uploading ? 'bg-dash-border text-dash-faint cursor-not-allowed' : 'bg-dash-secondary text-white hover:bg-dash-secondary-dk shadow-sm cursor-pointer']">
              <span v-if="uploading" class="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
              <ImagePlus v-else :size="14" />
              {{ t('productVariants.upload') }}
            </span>
          </label>
          <AButton size="sm" variant="ghost" @click="imagesExpanded = !imagesExpanded">
            {{ imagesExpanded ? t('productVariants.collapse') : t('productVariants.manage') }}
          </AButton>
        </div>
      </div>

      <!-- Expanded image grid -->
      <div v-if="imagesExpanded" class="px-5 pb-5">
        <div v-if="imagesLoading" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div v-for="i in 4" :key="i" class="aspect-square rounded-xl bg-dash-border animate-pulse" />
        </div>
        <div v-else-if="images.length" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div v-for="img in images" :key="img.id"
            class="group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer"
            :class="img.isThumbnail ? 'border-dash-primary shadow-card' : 'border-dash-border hover:border-dash-primary/40'"
            @click="setThumbnail(img)">
            <img :src="img.url" :alt="img.originalName ?? 'Product image'" class="h-full w-full object-cover" />
            <div v-if="img.isThumbnail" class="absolute top-1.5 left-1.5 bg-dash-primary text-white text-2xs font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <Star :size="9" /> {{ t('productVariants.thumbnail') }}
            </div>
            <button class="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-lg bg-dash-text/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dash-danger"
              @click.stop="deleteImage(img)">
              <X :size="11" />
            </button>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-8 text-center">
          <div class="h-10 w-10 rounded-2xl bg-dash-border flex items-center justify-center text-dash-faint mb-3">
            <ImageOff :size="20" />
          </div>
          <p class="text-sm font-medium text-dash-text">{{ t('productVariants.noImagesYet') }}</p>
          <p class="text-2xs text-dash-faint mt-1">{{ t('productVariants.noImagesHint') }}</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         WIZARD MODE — no variants exist yet
    ══════════════════════════════════════════════ -->
    <template v-if="!hasVariants">

      <!-- Step indicators -->
      <div class="flex items-stretch gap-2">
        <!-- Step 1 -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(1)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(1)]">
            <Check v-if="currentStep > 1" :size="10" />
            <span v-else>1</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="currentStep > 1 && productType === 'single'" class="text-emerald-400">{{ t('productVariants.singlePriceDone') }}</span>
            <span v-else-if="currentStep > 1 && productType === 'multi'" class="text-emerald-400">{{ t('productVariants.multiVariantsDone') }}</span>
            <span v-else>{{ t('productVariants.productType') }}</span>
          </div>
        </div>
        <!-- Step 2 (multi only) -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(2)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(2)]">
            <Check v-if="currentStep > 2" :size="10" />
            <span v-else>2</span>
          </div>
          <div class="text-xs font-medium leading-tight">
            <span v-if="currentStep > 2">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }} generated</span>
            <span v-else>{{ t('productVariants.step2') }}</span>
          </div>
        </div>
        <!-- Step 3 -->
        <div :class="['flex items-center gap-2 px-4 py-2.5 rounded-card border flex-1 transition-all', stepClass(3)]">
          <div :class="['w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', stepNumClass(3)]">
            <span>3</span>
          </div>
          <div class="text-xs font-medium leading-tight">{{ t('productVariants.setPrices') }}</div>
        </div>
      </div>

      <!-- ── Step 1: Product type ── -->
      <div v-if="currentStep === 1" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">{{ t('productVariants.step1Title') }}</h2>
        <p class="text-2xs text-dash-muted mb-4">{{ t('productVariants.howDoesItWork') }}</p>

        <div class="space-y-3">
          <label class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === 'single' ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'">
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === 'single' ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === 'single'" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" value="single" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">{{ t('productVariants.singlePrice') }}</p>
              <p class="text-2xs text-dash-muted mt-0.5">{{ t('productVariants.singlePriceDesc') }}</p>
            </div>
          </label>

          <label class="flex items-start gap-3 p-3 rounded-card border cursor-pointer transition-all"
            :class="productType === 'multi' ? 'border-dash-primary bg-dash-primary-lt/30' : 'border-dash-border hover:border-dash-muted'">
            <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              :class="productType === 'multi' ? 'border-dash-primary bg-dash-primary' : 'border-dash-border'">
              <div v-if="productType === 'multi'" class="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <input type="radio" v-model="productType" value="multi" class="sr-only" />
            <div>
              <p class="text-xs font-semibold text-dash-text">{{ t('productVariants.multipleVariants') }}</p>
              <p class="text-2xs text-dash-muted mt-0.5">{{ t('productVariants.multipleVariantsDesc') }}</p>
            </div>
          </label>
        </div>

        <div class="flex justify-end mt-5">
          <AButton size="sm" :disabled="!productType" :loading="generatingSingle" @click="handleStep1Continue">
            {{ t('productVariants.continueBtn') }}
          </AButton>
        </div>
      </div>

      <!-- ── Step 2: Define variants (multi only) ── -->
      <div v-if="currentStep === 2" class="bg-dash-surface rounded-card shadow-card p-5 space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-dash-text">{{ t('productVariants.step2Title') }}</h2>
          <p class="text-2xs text-dash-muted mt-0.5">{{ t('productVariants.step2Desc') }}</p>
        </div>

        <!-- Spec type selector -->
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
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)">
                  <ChevronUp :size="12" />
                </button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)">
                  <ChevronDown :size="12" />
                </button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)">
                  <X :size="12" />
                </button>
              </div>
              <!-- Value chips -->
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                    <X :size="10" />
                  </button>
                </span>
              </div>
              <!-- Value input -->
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

        <!-- Generate bar -->
        <div class="flex items-center justify-between pt-1 border-t border-dash-border">
          <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
            {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
            <span v-if="assignedSpecs.length > 1"> ({{ assignedSpecs.map(s => s.values.length).join(' × ') }})</span>
          </p>
          <p v-else-if="assignedSpecs.length" class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
          <p v-else class="text-xs text-dash-muted">{{ t('productVariants.addAtLeastOneSpec') }}</p>
          <AButton size="sm" :loading="generating" :disabled="!specsValid || !assignedSpecs.length"
            :title="!specsValid ? t('productVariants.addAtLeastOneValuePerSpec') : undefined"
            @click="handleGenerate()">
            <Zap :size="13" /> {{ t('productVariants.generateVariants') }}
          </AButton>
        </div>
      </div>

      <!-- ── Step 3: Set prices ── -->
      <div v-if="currentStep === 3" class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">
          {{ productType === 'single' ? t('productVariants.step3TitleSingle') : t('productVariants.step3TitleMulti') }}
        </h2>
        <p class="text-2xs text-dash-muted mb-4">
          {{ productType === 'single' ? t('productVariants.step3DescSingle') : t('productVariants.step3DescMulti') }}
        </p>

        <!-- Single: simple 2×2 grid -->
        <div v-if="productType === 'single'" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>

        <!-- Multi: inline table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in priceRows" :key="row.id" class="border-b border-dash-border/50 last:border-0">
                <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                <td class="py-1.5 px-1">
                  <input v-model="row.price" type="number" step="0.01" min="0"
                    :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                      priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">Required</p>
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
                  <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                    class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                    @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                  <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Save row -->
        <div class="flex items-center justify-between pt-2 border-t border-dash-border">
          <div class="flex items-center gap-2 text-2xs text-dash-muted">
            <span>{{ t('productVariants.overallStock') }}</span>
            <ABadge :status="overallStockPreview" />
          </div>
          <AButton size="sm" :loading="savingPrices" @click="savePrices">
            {{ productType === 'multi' ? t('productVariants.savePricesBtn') : t('productVariants.saveSingleBtn') }}
          </AButton>
        </div>
        <p v-if="saveError" class="mt-2 text-xs text-dash-danger">{{ saveError }}</p>
      </div>

    </template>

    <!-- ══════════════════════════════════════════════
         EDITING MODE — variants already exist
    ══════════════════════════════════════════════ -->
    <template v-else>

      <!-- Specs summary card (multi-variant products only) -->
      <div v-if="hasSpecs" class="bg-dash-surface rounded-card shadow-card">
        <div class="flex items-center justify-between px-5 py-3">
          <div>
            <h2 class="text-sm font-semibold text-dash-text">
              Variants — {{ assignedSpecs.map(s => s.name + (s.unit ? ` (${s.unit})` : '')).join(' × ') }}
              <span class="font-normal text-dash-muted text-xs">· {{ variants.length }} combinations</span>
            </h2>
            <p class="text-2xs text-dash-muted mt-0.5">
              {{ assignedSpecs.map(s => s.name + ': ' + s.values.join(', ')).join(' · ') }}
            </p>
          </div>
          <AButton size="sm" variant="secondary" @click="editSpecsExpanded = !editSpecsExpanded">
            {{ editSpecsExpanded ? t('productVariants.cancelEdit') : t('productVariants.editSpecs') }}
          </AButton>
        </div>

        <!-- Edit specs expanded -->
        <div v-if="editSpecsExpanded" class="px-5 pb-5 border-t border-dash-border space-y-4 pt-4">
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

          <div v-if="assignedSpecs.length" class="space-y-2">
            <div v-for="(spec, idx) in assignedSpecs" :key="spec.spec_type_id"
              class="px-3 py-2.5 rounded-btn border border-dash-border bg-dash-bg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-semibold text-dash-text flex-1">
                  {{ spec.name }}{{ spec.unit ? ` (${spec.unit})` : '' }}
                </span>
                <button :disabled="idx === 0" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, -1)">
                  <ChevronUp :size="12" />
                </button>
                <button :disabled="idx === assignedSpecs.length - 1" class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-text disabled:opacity-30" @click="moveSpec(idx, 1)">
                  <ChevronDown :size="12" />
                </button>
                <button class="w-5 h-5 flex items-center justify-center text-dash-muted hover:text-dash-danger" @click="removeSpec(idx)">
                  <X :size="12" />
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="(val, vi) in spec.values" :key="vi"
                  class="inline-flex items-center gap-1 rounded-full border border-dash-border bg-dash-surface px-2.5 py-1 text-xs font-medium text-dash-text">
                  {{ val }}{{ spec.unit ?? '' }}
                  <button @click="removeValue(spec, vi)" class="text-dash-faint hover:text-dash-danger ml-0.5">
                    <X :size="10" />
                  </button>
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
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-dash-border">
            <p v-if="assignedSpecs.length && specsValid" class="text-xs text-dash-muted">
              {{ t('productVariants.willGenerate') }} <span class="font-semibold text-dash-text">{{ combinationCount }} variant{{ combinationCount !== 1 ? 's' : '' }}</span>
              <span v-if="assignedSpecs.length > 1"> ({{ assignedSpecs.map(s => s.values.length).join(' × ') }})</span>
            </p>
            <p v-else class="text-xs text-dash-danger">{{ t('productVariants.addAtLeastOneValuePerSpec') }}</p>
            <AButton size="sm" variant="danger" :loading="generating" :disabled="!specsValid || !assignedSpecs.length"
              @click="handleGenerate()">
              <Zap :size="13" /> {{ t('productVariants.regenerateVariants') }}
            </AButton>
          </div>
        </div>
      </div>

      <!-- Switch to multiple variants (single-variant product only) -->
      <div v-if="!hasSpecs" class="text-center py-2">
        <button class="text-2xs text-dash-muted hover:text-dash-text underline underline-offset-2 transition-colors"
          @click="switchToMultiple">
          {{ t('productVariants.switchToMultiple') }}
        </button>
      </div>

      <!-- Price grid (always shown in editing mode) -->
      <div class="bg-dash-surface rounded-card shadow-card p-5">
        <h2 class="text-sm font-semibold text-dash-text mb-1">{{ t('productVariants.pricesAndStock') }}</h2>
        <p class="text-2xs text-dash-muted mb-4">{{ t('productVariants.changesAutoSave') }}</p>

        <!-- Single variant: 2×2 grid -->
        <div v-if="!hasSpecs && priceRows.length === 1" class="grid grid-cols-2 gap-3 mb-4">
          <AInput v-model="priceRows[0].price"             :label="t('productVariants.priceLyd')" type="number" step="0.01" :error="priceRowErrors[0]?.price" />
          <AInput v-model="priceRows[0].originalPrice"     :label="t('productVariants.originalPrice') + ' (LYD)'" type="number" step="0.01" />
          <AInput v-model="priceRows[0].quantity"          :label="t('productVariants.qty')" type="number" min="0" />
          <AInput v-model="priceRows[0].lowStockThreshold" :label="t('productVariants.lowAt')" type="number" min="0" />
        </div>

        <!-- Multi-variant: table -->
        <div v-else class="overflow-x-auto mb-4">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-dash-border">
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.variantCol') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.priceLyd') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.originalPrice') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.qty') }}</th>
                <th class="text-left py-2 px-2 text-2xs font-semibold text-dash-muted uppercase tracking-wide">{{ t('productVariants.lowAt') }}</th>
                <th class="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in priceRows" :key="row.id" class="border-b border-dash-border/50 last:border-0">
                <td class="py-2 px-2 font-semibold text-dash-text whitespace-nowrap">{{ variantLabel(row.id) }}</td>
                <td class="py-1.5 px-1">
                  <input v-model="row.price" type="number" step="0.01" min="0"
                    :class="['w-24 px-2 py-1 rounded-btn border text-xs bg-dash-bg text-dash-text focus:outline-none focus:border-dash-primary',
                      priceRowErrors[ri]?.price ? 'border-dash-danger' : 'border-dash-border']" />
                  <p v-if="priceRowErrors[ri]?.price" class="text-2xs text-dash-danger mt-0.5">Required</p>
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
                  <button v-if="!variants.find(v => v.id === row.id)?.isDefault"
                    class="text-2xs text-dash-muted hover:text-dash-primary transition-colors whitespace-nowrap"
                    @click="setDefault(row.id)">{{ t('productVariants.setDefault') }}</button>
                  <span v-else class="text-2xs font-semibold text-dash-primary whitespace-nowrap">{{ t('productVariants.defaultMark') }}</span>
                </td>
              </tr>
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
        <p v-if="saveError" class="mt-2 text-xs text-dash-danger">{{ saveError }}</p>
      </div>

    </template>

    <!-- Confirm regenerate modal -->
    <Teleport to="body">
      <div v-if="showRegenerateConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-dash-surface rounded-card shadow-card p-6 max-w-sm w-full mx-4">
          <h3 class="text-sm font-semibold text-dash-text mb-2">{{ t('productVariants.regenerateConfirmTitle') }}</h3>
          <p class="text-xs text-dash-muted mb-5">
            This will permanently delete {{ variants.length }} existing variant{{ variants.length !== 1 ? 's' : '' }} and regenerate from your current spec values. Continue?
          </p>
          <div class="flex gap-2 justify-end">
            <AButton size="sm" variant="ghost" @click="showRegenerateConfirm = false">{{ t('common.cancel') }}</AButton>
            <AButton size="sm" variant="danger" :loading="generating" @click="doGenerate(true)">{{ t('productVariants.regenerateBtn') }}</AButton>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ImagePlus, ImageOff, Star, X, ChevronUp, ChevronDown, Zap, Check } from 'lucide-vue-next'
import {
  apiGetVariants, apiSetDefaultVariant,
  apiBulkUpdateVariants,
  apiGetImages, apiUploadImages, apiSetThumbnail, apiDeleteImage,
  apiGetSpecTypes, apiGetProductSpecs, apiSaveProductSpecs, apiGenerateVariants,
} from '../api/admin'
import type { ProductVariant, ProductImage, SpecType, ProductSpec } from '../types'
import ABadge  from '../components/ui/ABadge.vue'
import AButton from '../components/ui/AButton.vue'
import AInput  from '../components/ui/AInput.vue'

const props     = defineProps<{ id: string }>()
const productId = Number(props.id)
const { t } = useI18n()

// ── Page-level error ──────────────────────────────────────────────
const pageError = ref<string | null>(null)

// ── Images ────────────────────────────────────────────────────────────
const images        = ref<ProductImage[]>([])
const imagesLoading = ref(true)
const uploading     = ref(false)
const imagesExpanded = ref(true)

async function loadImages() {
  imagesLoading.value = true
  try {
    const res = await apiGetImages(productId)
    images.value = res.data
  } catch { /* empty state */ } finally {
    imagesLoading.value = false
  }
}

async function handleUpload(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  uploading.value = true
  try {
    const res = await apiUploadImages(productId, files)
    images.value = [...images.value, ...res.data]
    if (images.value.length === res.data.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Upload failed.'
  } finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function setThumbnail(img: ProductImage) {
  if (img.isThumbnail) return
  try {
    await apiSetThumbnail(productId, img.id)
    images.value = images.value.map(i => ({ ...i, isThumbnail: i.id === img.id }))
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to set thumbnail.'
  }
}

async function deleteImage(img: ProductImage) {
  try {
    await apiDeleteImage(productId, img.id)
    images.value = images.value.filter(i => i.id !== img.id)
    if (img.isThumbnail && images.value.length) {
      images.value[0] = { ...images.value[0], isThumbnail: true }
    }
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to delete image.'
  }
}

// ── Variants ──────────────────────────────────────────────────────────
const variants = ref<ProductVariant[]>([])

const hasVariants = computed(() => variants.value.length > 0)
const hasSpecs    = computed(() =>
  hasVariants.value && variants.value[0]?.specs != null && variants.value[0].specs.length > 0
)

async function loadVariants() {
  try {
    const res = await apiGetVariants(productId)
    variants.value = res.data
    if (res.data.length > 0) {
      buildPriceRows(res.data)
      imagesExpanded.value = false
    }
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to load variants.'
  }
}

function variantLabel(variantId: number): string {
  const v = variants.value.find(x => x.id === variantId)
  if (!v || !v.specs || v.specs.length === 0) return 'Default'
  return v.specs.map(s => s.unit ? `${s.value}${s.unit}` : s.value).join(' / ')
}

// ── Specs ─────────────────────────────────────────────────────────────
const allSpecTypes  = ref<SpecType[]>([])
const assignedSpecs = ref<Array<{ spec_type_id: number; name: string; unit: string | null; values: string[] }>>([])
const specToAdd     = ref<number | ''>('')
const valueInputs   = ref<Record<number, string>>({})

const availableSpecTypes = computed(() =>
  allSpecTypes.value.filter(s => !assignedSpecs.value.some(a => a.spec_type_id === s.id))
)

const combinationCount = computed(() => {
  if (!assignedSpecs.value.length) return 1
  return assignedSpecs.value.reduce((acc, s) => acc * Math.max(s.values.length, 1), 1)
})

const specsValid = computed(() =>
  assignedSpecs.value.length > 0 && assignedSpecs.value.every(s => s.values.length > 0)
)

async function loadSpecs() {
  try {
    const [typesRes, specsRes] = await Promise.all([
      apiGetSpecTypes(),
      apiGetProductSpecs(productId),
    ])
    allSpecTypes.value = typesRes.data
    assignedSpecs.value = specsRes.data.specs.map((s: ProductSpec) => ({
      spec_type_id: s.spec_type_id,
      name:         s.name,
      unit:         s.unit,
      values:       s.values.map((v: { value: string }) => v.value),
    }))
    assignedSpecs.value.forEach(s => { valueInputs.value[s.spec_type_id] = '' })
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to load specs.'
  }
}

function addSpec() {
  if (!specToAdd.value) return
  const spec = allSpecTypes.value.find(s => s.id === specToAdd.value)
  if (!spec) return
  assignedSpecs.value.push({ spec_type_id: spec.id, name: spec.name, unit: spec.unit, values: [] })
  valueInputs.value[spec.id] = ''
  specToAdd.value = ''
}

function removeSpec(idx: number) {
  const removed = assignedSpecs.value[idx]
  delete valueInputs.value[removed.spec_type_id]
  assignedSpecs.value.splice(idx, 1)
}

function moveSpec(idx: number, dir: -1 | 1) {
  const arr = assignedSpecs.value
  const to  = idx + dir
  if (to < 0 || to >= arr.length) return
  ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
}

function addValue(spec: { spec_type_id: number; values: string[] }) {
  const val = (valueInputs.value[spec.spec_type_id] ?? '').trim()
  if (!val || spec.values.includes(val)) return
  spec.values.push(val)
  valueInputs.value[spec.spec_type_id] = ''
}

function removeValue(spec: { values: string[] }, idx: number) {
  spec.values.splice(idx, 1)
}

// ── Wizard state ──────────────────────────────────────────────────────
const currentStep           = ref<1 | 2 | 3>(1)
const productType           = ref<'single' | 'multi' | null>(null)
const generatingSingle      = ref(false)
const generating            = ref(false)
const showRegenerateConfirm = ref(false)
const editSpecsExpanded     = ref(false)

function stepClass(n: number): string {
  if (currentStep.value > n) return 'border-emerald-500/30 bg-emerald-900/20'
  if (currentStep.value === n) return 'border-dash-primary/40 bg-dash-primary-lt/20'
  return 'border-dash-border opacity-40'
}

function stepNumClass(n: number): string {
  if (currentStep.value > n) return 'bg-emerald-500 text-white'
  if (currentStep.value === n) return 'bg-dash-primary text-white'
  return 'bg-dash-border text-dash-muted'
}

async function handleStep1Continue() {
  if (!productType.value) return
  imagesExpanded.value = false

  if (productType.value === 'single') {
    generatingSingle.value = true
    pageError.value = null
    try {
      const res = await apiGenerateVariants(productId, false)
      variants.value = res.data
      buildPriceRows(res.data)
      currentStep.value = 3
    } catch (e: unknown) {
      pageError.value = (e as any)?.response?.data?.message ?? 'Failed to create variant.'
    } finally {
      generatingSingle.value = false
    }
  } else {
    currentStep.value = 2
  }
}

function handleGenerate() {
  if (variants.value.length > 0) {
    showRegenerateConfirm.value = true
    return
  }
  doGenerate(false)
}

async function doGenerate(force: boolean) {
  generating.value = true
  showRegenerateConfirm.value = false
  pageError.value = null
  try {
    await apiSaveProductSpecs(
      productId,
      assignedSpecs.value.map(s => ({ spec_type_id: s.spec_type_id, values: s.values }))
    )
    const res = await apiGenerateVariants(productId, force)
    variants.value = res.data
    buildPriceRows(res.data)
    editSpecsExpanded.value = false
    if (currentStep.value === 2) currentStep.value = 3
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Generation failed.'
  } finally {
    generating.value = false
  }
}

function switchToMultiple() {
  variants.value    = []
  priceRows.value   = []
  productType.value = 'multi'
  currentStep.value = 1
  imagesExpanded.value = false
}

// ── Price rows ────────────────────────────────────────────────────────
interface PriceRow {
  id:                number
  price:             string
  originalPrice:     string
  quantity:          string
  lowStockThreshold: string
}
const priceRows      = ref<PriceRow[]>([])
const priceRowErrors = ref<Array<{ price?: string }>>([])
const savingPrices   = ref(false)
const saveError      = ref<string | null>(null)

function buildPriceRows(vs: ProductVariant[]) {
  priceRows.value = vs.map(v => ({
    id:                v.id,
    price:             String(v.price),
    originalPrice:     v.originalPrice != null ? String(v.originalPrice) : '',
    quantity:          String(v.quantity),
    lowStockThreshold: String(v.lowStockThreshold),
  }))
  priceRowErrors.value = vs.map(() => ({}))
}

const overallStockPreview = computed(() => {
  if (!priceRows.value.length) return 'out_of_stock'
  const statuses = priceRows.value.map(r => {
    const qty       = Number(r.quantity) || 0
    const threshold = Number(r.lowStockThreshold) || 5
    if (qty === 0)        return 'out_of_stock'
    if (qty <= threshold) return 'low_stock'
    return 'in_stock'
  })
  if (statuses.every(s => s === 'out_of_stock')) return 'out_of_stock'
  if (statuses.some(s => s === 'in_stock'))      return 'in_stock'
  return 'low_stock'
})

async function savePrices() {
  priceRowErrors.value = priceRows.value.map(r => ({
    price: !r.price ? 'Required' : undefined,
  }))
  if (priceRowErrors.value.some(e => e.price)) return

  savingPrices.value = true
  saveError.value    = null
  try {
    const res = await apiBulkUpdateVariants(productId, priceRows.value.map(r => ({
      id:                  r.id,
      price:               Number(r.price),
      original_price:      r.originalPrice ? Number(r.originalPrice) : null,
      quantity:            Number(r.quantity),
      low_stock_threshold: Number(r.lowStockThreshold),
    })))
    variants.value = res.data
    buildPriceRows(res.data)
  } catch (e: unknown) {
    saveError.value = (e as any)?.response?.data?.message ?? 'Save failed.'
  } finally {
    savingPrices.value = false
  }
}

// ── Default variant ───────────────────────────────────────────────────
async function setDefault(variantId: number) {
  try {
    await apiSetDefaultVariant(productId, variantId)
    variants.value = variants.value.map(v => ({ ...v, isDefault: v.id === variantId }))
  } catch (e: unknown) {
    pageError.value = (e as any)?.response?.data?.message ?? 'Failed to set default.'
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => { loadImages(); loadSpecs(); loadVariants() })
watch(() => props.id, () => {
  currentStep.value           = 1
  productType.value           = null
  assignedSpecs.value         = []
  valueInputs.value           = {}
  priceRows.value             = []
  priceRowErrors.value        = []
  editSpecsExpanded.value     = false
  showRegenerateConfirm.value = false
  imagesExpanded.value        = true
  pageError.value             = null
  saveError.value             = null
  loadImages(); loadSpecs(); loadVariants()
})
</script>
