<template>
    <div class="wallet-container">
        <!-- 顶部标题栏 -->
        <div class="wallet-header">
            <div>
                <p class="wallet-eyebrow">PERSONAL WALLET</p>
                <h1 class="wallet-title">我的钱包</h1>
            </div>
            <span class="wallet-header-note">余额与收支，清晰掌握</span>
        </div>

        <!-- 下方内容 -->
        <div class="wallet-body">
            <!-- 左侧：余额 + 操作 -->
            <div class="wallet-left">

                <!-- 余额卡片 -->
                <div class="balance-card">
                    <div class="bc-deco"></div>
                    <div class="bc-deco2"></div>
                    <div class="bc-body">
                        <div class="bc-label">
                            <span>可用余额</span>
                            <button type="button" class="bc-eye" :aria-label="showBalance ? '隐藏余额' : '显示余额'" @click="showBalance = !showBalance">
                                <el-icon>
                                    <View v-if="showBalance" />
                                    <Hide v-else />
                                </el-icon>
                            </button>
                        </div>
                        <div class="bc-amount">
                            <span class="bc-currency">¥</span>
                            <span class="bc-value">{{ showBalance ? formatAmount(walletInfo.balance) : '••••••'
                                }}</span>
                        </div>
                        <div class="bc-meta">
                            <div class="bc-meta-item">
                                <span class="bc-meta-label">冻结金额</span>
                                <span class="bc-meta-val freeze">¥{{ formatAmount(walletInfo.freezeBalance) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 快捷操作 -->
                <div class="quick-actions">
                    <div class="qa-item" @click="showRecharge = true">
                        <div class="qa-icon topup"><el-icon size="20">
                                <Plus />
                            </el-icon></div>
                        <span>充值</span>
                    </div>
                    <div class="qa-item" @click="showWithdraw = true">
                        <div class="qa-icon withdraw"><el-icon size="20">
                                <CreditCard />
                            </el-icon></div>
                        <span>提现</span>
                    </div>
                    <div class="qa-item" @click="handleTransfer">
                        <div class="qa-icon transfer"><el-icon size="20">
                                <Upload />
                            </el-icon></div>
                        <span>转账</span>
                    </div>
                    <div class="qa-item" @click="handleReceive">
                        <div class="qa-icon receive"><el-icon size="20">
                                <Download />
                            </el-icon></div>
                        <span>收款</span>
                    </div>
                </div>

                <!-- 本月统计 -->
                <div class="month-stats" v-if="monthStats.income > 0 || monthStats.expense > 0">
                    <div class="ms-title">本月账单</div>
                    <div class="ms-row">
                        <div class="ms-item">
                            <span class="ms-label">收入</span>
                            <span class="ms-val income">+¥{{ formatAmount(monthStats.income) }}</span>
                        </div>
                        <div class="ms-divider"></div>
                        <div class="ms-item">
                            <span class="ms-label">支出</span>
                            <span class="ms-val expense">-¥{{ formatAmount(monthStats.expense) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧：账单流水 -->
            <div class="wallet-right">
                <div class="bill-header">
                    <span class="bill-title">账单流水</span>
                    <div class="bill-tabs">
                        <span v-for="tab in tabs" :key="tab.type" class="bill-tab"
                            :class="{ active: activeTab === tab.type }" @click="switchTab(tab.type)">{{ tab.label
                            }}</span>
                    </div>
                </div>

                <el-scrollbar class="bill-scroll">
                    <div v-if="loading" class="bill-loading">
                        <span class="spin"></span>加载中...
                    </div>
                    <template v-else-if="records.length > 0">
                        <div class="bill-item" v-for="r in records" :key="r.id">
                            <div class="bi-icon" :class="getTypeClass(r.type)">
                                <el-icon size="15">
                                    <component :is="getTypeIcon(r.type)" />
                                </el-icon>
                            </div>
                            <div class="bi-info">
                                <span class="bi-name">{{ r.typeDesc }}</span>
                                <span class="bi-remark" v-if="r.remark">{{ r.remark }}</span>
                                <span class="bi-time">{{ formatTime(r.createTime) }}</span>
                            </div>
                            <div class="bi-right">
                                <span class="bi-amount" :class="r.amount >= 0 ? 'income' : 'expense'">
                                    {{ r.amount >= 0 ? '+' : '' }}¥{{ Math.abs(r.amount).toFixed(2) }}
                                </span>
                                <span class="bi-balance">余额 ¥{{ Number(r.afterBalance).toFixed(2) }}</span>
                            </div>
                        </div>
                        <!-- 加载更多 -->
                        <div class="bill-more" v-if="hasMore" @click="loadMore">加载更多</div>
                        <div class="bill-end" v-else>— 已加载全部 —</div>
                    </template>
                    <div v-else class="bill-empty">
                        <el-icon size="36">
                            <Document />
                        </el-icon>
                        <span>暂无账单记录</span>
                        <small>你的收支记录会显示在这里</small>
                    </div>
                </el-scrollbar>
            </div>
        </div>
        <!-- 关闭 wallet-body -->
    </div>

    <!-- 充值弹窗 -->
    <Teleport to="body">
        <Transition name="dlg-fade">
            <div v-if="showRecharge" class="dlg-overlay" @click.self="showRecharge = false">
                <div class="dlg">
                    <div class="dlg-header">
                        <span>充值</span>
                        <button class="dlg-close" @click="showRecharge = false">✕</button>
                    </div>
                    <div class="dlg-body">
                        <div class="dlg-presets">
                            <span v-for="p in presets" :key="p" class="preset-btn"
                                :class="{ active: rechargeAmount === p }" @click="rechargeAmount = p">¥{{ p }}</span>
                        </div>
                        <div class="dlg-input-wrap">
                            <span class="dlg-prefix">¥</span>
                            <input type="number" v-model="rechargeAmount" class="dlg-input" placeholder="自定义金额"
                                min="0.01" step="0.01" />
                        </div>
                    </div>
                    <div class="dlg-footer">
                        <button class="dlg-cancel" @click="showRecharge = false">取消</button>
                        <button class="dlg-confirm topup-btn" :disabled="!rechargeAmount || rechargeLoading"
                            @click="doRecharge">
                            {{ rechargeLoading ? '处理中...' : '确认充值' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <!-- 提现弹窗 -->
    <Teleport to="body">
        <Transition name="dlg-fade">
            <div v-if="showWithdraw" class="dlg-overlay" @click.self="showWithdraw = false">
                <div class="dlg">
                    <div class="dlg-header">
                        <span>提现</span>
                        <button class="dlg-close" @click="showWithdraw = false">✕</button>
                    </div>
                    <div class="dlg-body">
                        <div class="dlg-balance-tip">当前余额：<strong>¥{{ formatAmount(walletInfo.balance) }}</strong></div>
                        <div class="dlg-input-wrap">
                            <span class="dlg-prefix">¥</span>
                            <input type="number" v-model="withdrawAmount" class="dlg-input" placeholder="提现金额"
                                min="0.01" step="0.01" />
                        </div>
                        <div class="dlg-all-btn" @click="withdrawAmount = walletInfo.balance">全部提现</div>
                    </div>
                    <div class="dlg-footer">
                        <button class="dlg-cancel" @click="showWithdraw = false">取消</button>
                        <button class="dlg-confirm withdraw-btn" :disabled="!withdrawAmount || withdrawLoading"
                            @click="doWithdraw">
                            {{ withdrawLoading ? '处理中...' : '确认提现' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, Plus, CreditCard, Upload, Download, Refresh, Star, Present, Document } from '@element-plus/icons-vue'
import { getWalletInfoApi, rechargeApi, withdrawApi, getWalletRecordsApi } from '@/api/Wallet'
import dayjs from 'dayjs'

const showBalance = ref(true)
const showRecharge = ref(false)
const showWithdraw = ref(false)
const rechargeAmount = ref<number | null>(null)
const withdrawAmount = ref<number | null>(null)
const rechargeLoading = ref(false)
const withdrawLoading = ref(false)
const loading = ref(false)
const presets = [50, 100, 200, 500]

const walletInfo = reactive({ balance: 0, freezeBalance: 0 })
const records = ref<any[]>([])
const activeTab = ref(0)
const page = ref(1)
const hasMore = ref(false)
const total = ref(0)
const PAGE_SIZE = 20

const tabs = [
    { type: 0, label: '全部' },
    { type: 1, label: '充值' },
    { type: 2, label: '提现' },
    { type: 5, label: '红包' },
    { type: 6, label: '红包收入' },
    { type: 3, label: '打赏' },
    { type: 7, label: '转账' },
]

const monthStats = computed(() => {
    const now = dayjs()
    const thisMonthRecords = records.value.filter(r => dayjs(r.createTime).isSame(now, 'month'))
    return {
        income: thisMonthRecords.filter(r => r.amount > 0).reduce((s, r) => s + Number(r.amount), 0),
        expense: thisMonthRecords.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(Number(r.amount)), 0),
    }
})

function formatAmount(val: number | string) {
    const n = Number(val)
    return isNaN(n) ? '0.00' : n.toFixed(2)
}

function formatTime(t: string) {
    return t ? dayjs(t).format('MM-DD HH:mm') : ''
}

function getTypeClass(type: number) {
    if ([1, 6, 4, 8].includes(type)) return 'income'
    if ([2, 3, 5, 7].includes(type)) return 'expense'
    return 'other'
}

function getTypeIcon(type: number) {
    switch (type) {
        case 1: return Plus
        case 2: return CreditCard
        case 3: return Star
        case 4: return Star
        case 5: return Present
        case 6: return Present
        case 7: return Upload
        case 8: return Download
        default: return Refresh
    }
}

async function loadWalletInfo() {
    try {
        const res = await getWalletInfoApi()
        if (res?.data) {
            walletInfo.balance = Number(res.data.balance) || 0
            walletInfo.freezeBalance = Number(res.data.freezeBalance) || 0
        }
    } catch { /* ignore */ }
}

async function loadRecords(reset = false) {
    if (loading.value) return
    if (reset) { page.value = 1; records.value = [] }
    loading.value = true
    try {
        const res = await getWalletRecordsApi(page.value, PAGE_SIZE, activeTab.value)
        const list = res?.data?.data || res?.data?.list || res?.data?.records || []
        total.value = res?.data?.total || 0
        if (reset) {
            records.value = list
        } else {
            records.value.push(...list)
        }
        hasMore.value = records.value.length < total.value
    } catch { /* ignore */ } finally {
        loading.value = false
    }
}

function switchTab(type: number) {
    activeTab.value = type
    loadRecords(true)
}

function loadMore() {
    page.value++
    loadRecords(false)
}

async function doRecharge() {
    if (!rechargeAmount.value || rechargeAmount.value <= 0) {
        ElMessage.warning('请输入充值金额')
        return
    }
    rechargeLoading.value = true
    try {
        await rechargeApi({ amount: rechargeAmount.value })
        ElMessage.success('充值成功')
        showRecharge.value = false
        rechargeAmount.value = null
        await loadWalletInfo()
        await loadRecords(true)
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.msg || '充值失败')
    } finally {
        rechargeLoading.value = false
    }
}

async function doWithdraw() {
    if (!withdrawAmount.value || withdrawAmount.value <= 0) {
        ElMessage.warning('请输入提现金额')
        return
    }
    if (withdrawAmount.value > walletInfo.balance) {
        ElMessage.warning('余额不足')
        return
    }
    withdrawLoading.value = true
    try {
        await withdrawApi({ amount: withdrawAmount.value })
        ElMessage.success('提现成功')
        showWithdraw.value = false
        withdrawAmount.value = null
        await loadWalletInfo()
        await loadRecords(true)
    } catch (e: any) {
        ElMessage.error(e?.response?.data?.msg || '提现失败')
    } finally {
        withdrawLoading.value = false
    }
}

const handleTransfer = () => ElMessage.info('转账功能即将上线')
const handleReceive = () => ElMessage.info('收款功能即将上线')

onMounted(() => {
    loadWalletInfo()
    loadRecords(true)
})
</script>

<style scoped>
.wallet-container { width: 100%; height: 100%; min-width: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--color-text-primary); background: var(--color-welcome-surface); backdrop-filter: blur(24px); -webkit-app-region: no-drag; }
.wallet-header { min-height: 100px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 28px 34px 18px; -webkit-app-region: drag; }
.wallet-eyebrow { margin-bottom: 4px; color: var(--color-text-muted); font-size: 9px; font-weight: 600; letter-spacing: 2.5px; }
.wallet-title { margin: 0; color: var(--color-text-strong); font-size: 25px; font-weight: 600; letter-spacing: 1px; }
.wallet-header-note { margin-top: 14px; color: var(--color-text-secondary); font-size: 12px; }
.wallet-body { display: grid; grid-template-columns: 290px minmax(0, 1fr); flex: 1; min-height: 0; gap: 24px; padding: 8px 34px 30px; overflow: hidden; }
.wallet-left { display: flex; min-height: 0; flex-direction: column; gap: 20px; overflow-y: auto; scrollbar-width: none; }
.balance-card { position: relative; flex-shrink: 0; overflow: hidden; border: 1px solid rgba(212, 236, 253, .22); border-radius: 20px; background: var(--color-wallet-card); box-shadow: var(--shadow-md); color: #edf7ff; }
.bc-body { position: relative; z-index: 1; padding: 25px 24px 22px; }
.bc-deco, .bc-deco2 { position: absolute; width: 220px; height: 220px; right: -100px; top: -80px; border: 1px solid rgba(223, 241, 255, .16); border-radius: 50%; pointer-events: none; }
.bc-deco2 { right: -65px; top: -112px; background: rgba(210, 236, 253, .035); }
.bc-label { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #d6e9f7; font-size: 12px; }
.bc-eye { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 7px; color: #d6e9f7; cursor: pointer; }
.bc-eye:hover { color: #fff; background: #ffffff12; }
.bc-amount { display: flex; align-items: baseline; gap: 5px; margin: 18px 0 25px; }
.bc-currency { font-size: 21px; font-weight: 400; color: #d0e8f9; }
.bc-value { overflow-wrap: anywhere; font-size: 40px; font-weight: 600; line-height: 1.1; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.bc-meta { padding-top: 15px; border-top: 1px solid #d9efff22; }
.bc-meta-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bc-meta-label { color: #bed9ed; font-size: 11px; }
.bc-meta-val { color: #e7f4ff; font-size: 13px; font-variant-numeric: tabular-nums; }
.quick-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.qa-item { display: flex; align-items: center; gap: 10px; min-height: 72px; padding: 14px 12px; color: var(--color-text-primary); font-size: 12px; background: var(--color-surface-1); border: 1px solid var(--color-border-subtle); border-radius: 13px; cursor: pointer; transition: background var(--transition-fast), border-color var(--transition-fast); }
.qa-item:hover { background: var(--color-surface-2); border-color: var(--color-border-primary); }
.qa-icon { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; background: var(--color-accent-soft); color: var(--color-text-accent); }
.qa-icon.withdraw { background: rgba(198, 151, 109, .12); color: var(--color-warning); }
.qa-icon.receive { background: rgba(89, 160, 137, .13); color: var(--color-success); }
.month-stats { padding: 18px; background: var(--color-surface-1); border: 1px solid var(--color-border-subtle); border-radius: 14px; }
.ms-title { margin-bottom: 16px; color: var(--color-text-secondary); font-size: 12px; font-weight: 600; }
.ms-row { display: flex; align-items: center; }
.ms-item { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 5px; }
.ms-label { color: var(--color-text-muted); font-size: 11px; }
.ms-val { overflow-wrap: anywhere; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ms-val.income { color: var(--color-success); }
.ms-val.expense { color: var(--color-text-primary); }
.ms-divider { width: 1px; height: 30px; margin: 0 14px; background: var(--color-border-subtle); }
.wallet-right { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; border: 1px solid var(--color-border-subtle); border-radius: 20px; background: var(--color-surface-1); box-shadow: var(--shadow-sm); }
.bill-header { display: flex; flex-shrink: 0; flex-direction: column; gap: 17px; padding: 23px 24px 18px; border-bottom: 1px solid var(--color-border-subtle); }
.bill-title { color: var(--color-text-strong); font-size: 16px; font-weight: 600; }
.bill-tabs { display: flex; flex-wrap: wrap; gap: 5px; }
.bill-tab { padding: 5px 10px; color: var(--color-text-secondary); font-size: 11px; border-radius: 7px; cursor: pointer; transition: background var(--transition-fast), color var(--transition-fast); }
.bill-tab:hover { background: var(--color-surface-2); }
.bill-tab.active { color: var(--color-text-accent); font-weight: 600; background: var(--color-accent-soft); }
.bill-scroll { flex: 1; min-height: 0; padding: 0 12px; overflow: hidden; }
:deep(.el-scrollbar__wrap) { padding-bottom: 16px; }
:deep(.el-scrollbar__thumb) { background: rgba(var(--color-accent-rgb), .3); }
.bill-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 60px 20px; color: var(--color-text-muted); font-size: 13px; }
.spin { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--color-border-subtle); border-top-color: var(--color-accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.bill-item { display: flex; align-items: center; gap: 13px; padding: 18px 12px; border-bottom: 1px solid var(--color-border-subtle); border-radius: 8px; transition: background var(--transition-fast); }
.bill-item:hover { background: var(--color-surface-2); }
.bi-icon { display: grid; place-items: center; flex-shrink: 0; width: 38px; height: 38px; border-radius: 12px; }
.bi-icon.income { color: var(--color-success); background: rgba(89, 160, 137, .14); }
.bi-icon.expense { color: var(--color-warning); background: rgba(198, 151, 109, .14); }
.bi-icon.other { color: var(--color-text-accent); background: var(--color-accent-soft); }
.bi-info { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 3px; }
.bi-name { color: var(--color-text-primary); font-size: 13px; font-weight: 600; }
.bi-remark { overflow: hidden; color: var(--color-text-secondary); font-size: 11px; white-space: nowrap; text-overflow: ellipsis; }
.bi-time { color: var(--color-text-muted); font-size: 10px; }
.bi-right { display: flex; flex-shrink: 0; flex-direction: column; align-items: flex-end; gap: 4px; }
.bi-amount { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.bi-amount.income { color: var(--color-success); }
.bi-amount.expense { color: var(--color-text-primary); }
.bi-balance { color: var(--color-text-muted); font-size: 10px; }
.bill-more, .bill-end { padding: 18px 12px; color: var(--color-text-muted); text-align: center; font-size: 11px; }
.bill-more { cursor: pointer; color: var(--color-text-accent); }
.bill-more:hover { color: var(--color-accent); }
.bill-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 74px 20px 40px; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.bill-empty > .el-icon { width: 76px; height: 76px; margin-bottom: 6px; color: var(--color-text-accent); background: var(--color-surface-1); border: 1px solid var(--color-border-subtle); border-radius: 24px; }
.bill-empty small { color: var(--color-text-muted); font-size: 11px; }
.dlg-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10000; background: rgba(12, 33, 49, .42); backdrop-filter: blur(8px); -webkit-app-region: no-drag; }
.dlg-fade-enter-active, .dlg-fade-leave-active { transition: opacity .2s ease; }
.dlg-fade-enter-from, .dlg-fade-leave-to { opacity: 0; }
.dlg { width: 360px; max-width: calc(100vw - 40px); overflow: hidden; color: var(--color-text-primary); background: var(--color-bg-deep); border: 1px solid var(--color-border-subtle); border-radius: 18px; box-shadow: var(--shadow-lg); backdrop-filter: blur(24px); }
.dlg-header { display: flex; align-items: center; justify-content: space-between; padding: 19px 22px; font-size: 16px; font-weight: 600; border-bottom: 1px solid var(--color-border-subtle); }
.dlg-close { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--color-text-muted); cursor: pointer; }
.dlg-close:hover { color: var(--color-text-primary); background: var(--color-surface-2); }
.dlg-body { display: flex; flex-direction: column; gap: 17px; padding: 24px 22px; }
.dlg-presets { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.preset-btn { padding: 10px 4px; border-radius: 9px; background: var(--color-surface-1); color: var(--color-text-secondary); text-align: center; font-size: 13px; cursor: pointer; }
.preset-btn:hover, .preset-btn.active { background: var(--color-accent-soft); color: var(--color-text-accent); }
.dlg-balance-tip { color: var(--color-text-secondary); font-size: 13px; }
.dlg-balance-tip strong { color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.dlg-input-wrap { display: flex; align-items: center; overflow: hidden; border-radius: 10px; background: var(--color-input-surface); }
.dlg-prefix { padding: 0 15px; color: var(--color-text-secondary); font-size: 20px; }
.dlg-input { flex: 1; min-width: 0; padding: 14px 10px 14px 0; color: var(--color-text-primary); font-size: 23px; font-weight: 600; appearance: textfield; }
.dlg-input::placeholder { color: var(--color-text-muted); font-size: 14px; font-weight: 400; }
.dlg-input::-webkit-outer-spin-button, .dlg-input::-webkit-inner-spin-button { appearance: none; margin: 0; }
.dlg-all-btn { color: var(--color-text-accent); text-align: right; font-size: 12px; cursor: pointer; }
.dlg-footer { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--color-border-subtle); }
.dlg-cancel, .dlg-confirm { flex: 1; padding: 11px; border-radius: 9px; font: inherit; font-size: 13px; cursor: pointer; }
.dlg-cancel { color: var(--color-text-secondary); background: var(--color-surface-2); }
.dlg-cancel:hover { background: var(--color-surface-3); }
.dlg-confirm { flex: 2; color: #f1f9ff; background: #407fa9; font-weight: 600; }
.dlg-confirm:hover:not(:disabled) { background: #326f98; }
.dlg-confirm:disabled { opacity: .4; cursor: not-allowed; }
@media (max-width: 1150px) { .wallet-header { padding-left: 24px; padding-right: 24px; } .wallet-body { grid-template-columns: 260px minmax(0, 1fr); gap: 18px; padding-left: 24px; padding-right: 24px; } .bc-body { padding-left: 20px; padding-right: 20px; } }
@media (max-height: 650px) { .wallet-header { min-height: 85px; padding-top: 20px; } .wallet-body { padding-bottom: 20px; } }
</style>
