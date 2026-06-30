<template>
    <div class="wallet-container">
        <!-- 顶部标题栏 -->
        <div class="wallet-header">
            <span class="wallet-title">我的钱包</span>
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
                        <span class="bc-eye" @click="showBalance = !showBalance">
                            <el-icon>
                                <View v-if="showBalance" />
                                <Hide v-else />
                            </el-icon>
                        </span>
                    </div>
                    <div class="bc-amount">
                        <span class="bc-currency">¥</span>
                        <span class="bc-value">{{ showBalance ? formatAmount(walletInfo.balance) : '••••••' }}</span>
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
                        :class="{ active: activeTab === tab.type }" @click="switchTab(tab.type)">{{ tab.label }}</span>
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
import { View, Hide, Plus, CreditCard, Upload, Download, Money, Wallet, Refresh, Star } from '@element-plus/icons-vue'
import { getWalletInfoApi, rechargeApi, withdrawApi, getWalletRecordsApi } from '../../api/Wallet'
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
        case 5: return Gift
        case 6: return Gift
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
.wallet-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* ===== 顶部标题栏 ===== */
.wallet-header {
    height: 40px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.15) 0%, rgba(0, 217, 255, 0.1) 100%);
    border-bottom: 1px solid rgba(67, 243, 255, 0.3);
    -webkit-app-region: drag;
    flex-shrink: 0;
}

.wallet-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #43f3ff;
    text-shadow: 0 0 8px rgba(67, 243, 255, 0.4);
    -webkit-app-region: no-drag;
}

/* ===== 标题栏下方 ===== */
.wallet-body {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* ===== 左侧 ===== */
.wallet-left {
    width: 280px;
    flex-shrink: 0;
    height: 100%;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    border-right: 1px solid rgba(66, 153, 225, 0.15);
    overflow-y: auto;
}

.wallet-left::-webkit-scrollbar {
    width: 0;
}

/* 余额卡片 */
.balance-card {
    position: relative;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.12) 0%, rgba(0, 140, 255, 0.08) 60%, rgba(120, 80, 255, 0.1) 100%);
    border: 1px solid rgba(67, 243, 255, 0.22);
    box-shadow: 0 0 24px rgba(67, 243, 255, 0.08);
    overflow: hidden;
}

.bc-deco {
    position: absolute;
    top: -30px;
    right: -20px;
    width: 130px;
    height: 130px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(67, 243, 255, 0.07) 0%, transparent 70%);
    pointer-events: none;
}

.bc-deco2 {
    position: absolute;
    bottom: -20px;
    left: -15px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(120, 80, 255, 0.06) 0%, transparent 70%);
    pointer-events: none;
}

.bc-body {
    padding: 22px 18px 18px;
    position: relative;
    z-index: 1;
}

.bc-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 8px;
}

.bc-eye {
    cursor: pointer;
    color: rgba(67, 243, 255, 0.5);
    transition: color 0.2s;
    display: flex;
    align-items: center;
}

.bc-eye:hover {
    color: #43f3ff;
}

.bc-amount {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin-bottom: 16px;
}

.bc-currency {
    font-size: 18px;
    font-weight: 500;
    color: #43f3ff;
    opacity: 0.8;
}

.bc-value {
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 16px rgba(67, 243, 255, 0.35);
    font-variant-numeric: tabular-nums;
}

.bc-meta {
    display: flex;
    gap: 24px;
}

.bc-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.bc-meta-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
}

.bc-meta-val {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    font-weight: 500;
}

.bc-meta-val.freeze {
    color: rgba(255, 200, 80, 0.75);
}

/* 快捷操作 */
.quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.qa-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 10px 4px 8px;
    border-radius: 12px;
    background: rgba(66, 153, 225, 0.06);
    border: 1px solid rgba(66, 153, 225, 0.12);
    transition: all 0.25s ease;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
}

.qa-item:hover {
    transform: translateY(-2px);
    border-color: rgba(66, 153, 225, 0.3);
    color: rgba(255, 255, 255, 0.85);
}

.qa-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s;
}

.qa-icon.topup {
    background: rgba(120, 140, 255, 0.12);
    border: 1px solid rgba(120, 140, 255, 0.22);
    color: #788cff;
}

.qa-icon.withdraw {
    background: rgba(255, 140, 100, 0.1);
    border: 1px solid rgba(255, 140, 100, 0.2);
    color: #ff8c64;
}

.qa-icon.transfer {
    background: rgba(67, 243, 255, 0.1);
    border: 1px solid rgba(67, 243, 255, 0.2);
    color: #43f3ff;
}

.qa-icon.receive {
    background: rgba(0, 255, 136, 0.08);
    border: 1px solid rgba(0, 255, 136, 0.18);
    color: #00ff88;
}

.qa-item:hover .qa-icon {
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

/* 月统计 */
.month-stats {
    background: rgba(66, 153, 225, 0.05);
    border: 1px solid rgba(66, 153, 225, 0.12);
    border-radius: 12px;
    padding: 14px 16px;
}

.ms-title {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 10px;
}

.ms-row {
    display: flex;
    align-items: center;
    gap: 0;
}

.ms-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.ms-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
}

.ms-val {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.ms-val.income {
    color: #4cd964;
}

.ms-val.expense {
    color: rgba(255, 255, 255, 0.7);
}

.ms-divider {
    width: 1px;
    height: 32px;
    background: rgba(66, 153, 225, 0.15);
    margin: 0 16px;
}

/* ===== 右侧账单 ===== */
.wallet-right {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.bill-header {
    padding: 20px 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
}

.bill-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
}

.bill-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.bill-tab {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(66, 153, 225, 0.12);
    transition: all 0.2s;
}

.bill-tab:hover {
    color: rgba(255, 255, 255, 0.75);
    border-color: rgba(66, 153, 225, 0.25);
}

.bill-tab.active {
    background: rgba(67, 243, 255, 0.12);
    border-color: rgba(67, 243, 255, 0.3);
    color: #43f3ff;
}

.bill-scroll {
    flex: 1;
    padding: 14px 20px 0;
    overflow: hidden;
}

:deep(.el-scrollbar__wrap) {
    padding-bottom: 16px;
}

:deep(.el-scrollbar__thumb) {
    background: rgba(67, 243, 255, 0.3);
    border-radius: 3px;
}

:deep(.el-scrollbar__thumb:hover) {
    background: rgba(67, 243, 255, 0.5);
}

.bill-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    padding: 40px;
    color: rgba(255, 255, 255, 0.35);
    font-size: 13px;
}

.spin {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(67, 243, 255, 0.2);
    border-top-color: #43f3ff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.bill-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border-radius: 10px;
    transition: background 0.2s;
    cursor: default;
}

.bill-item:hover {
    background: rgba(66, 153, 225, 0.06);
}

.bi-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.bi-icon.income {
    background: rgba(0, 255, 136, 0.1);
    color: #4cd964;
}

.bi-icon.expense {
    background: rgba(255, 140, 100, 0.1);
    color: #ff8c64;
}

.bi-icon.other {
    background: rgba(66, 153, 225, 0.1);
    color: #4299e1;
}

.bi-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.bi-name {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
}

.bi-remark {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.bi-time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
}

.bi-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
}

.bi-amount {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.bi-amount.income {
    color: #4cd964;
}

.bi-amount.expense {
    color: rgba(255, 255, 255, 0.75);
}

.bi-balance {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.25);
}

.bill-more {
    text-align: center;
    padding: 12px;
    font-size: 12px;
    color: rgba(67, 243, 255, 0.55);
    cursor: pointer;
    transition: color 0.2s;
}

.bill-more:hover {
    color: #43f3ff;
}

.bill-end {
    text-align: center;
    padding: 14px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
}

.bill-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 60px 0;
    color: rgba(255, 255, 255, 0.25);
    font-size: 13px;
}

/* ===== 弹窗通用 ===== */
.dlg-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.dlg-fade-enter-active,
.dlg-fade-leave-active {
    transition: opacity 0.2s ease;
}

.dlg-fade-enter-from,
.dlg-fade-leave-to {
    opacity: 0;
}

.dlg {
    width: 340px;
    border-radius: 14px;
    background: rgba(22, 32, 48, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(66, 153, 225, 0.25);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    color: #f0f0f0;
    overflow: hidden;
}

.dlg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    font-size: 15px;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dlg-close {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.dlg-close:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
}

.dlg-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.dlg-presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.preset-btn {
    padding: 8px 4px;
    text-align: center;
    border-radius: 8px;
    border: 1px solid rgba(66, 153, 225, 0.2);
    background: rgba(66, 153, 225, 0.06);
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.preset-btn:hover {
    border-color: rgba(67, 243, 255, 0.3);
    color: rgba(255, 255, 255, 0.9);
}

.preset-btn.active {
    background: rgba(67, 243, 255, 0.12);
    border-color: rgba(67, 243, 255, 0.4);
    color: #43f3ff;
}

.dlg-balance-tip {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    text-align: center;
}

.dlg-balance-tip strong {
    color: #43f3ff;
}

.dlg-input-wrap {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(66, 153, 225, 0.2);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.2s;
}

.dlg-input-wrap:focus-within {
    border-color: rgba(67, 243, 255, 0.4);
}

.dlg-prefix {
    padding: 0 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.4);
}

.dlg-input {
    flex: 1;
    border: none;
    background: none;
    color: #f0f0f0;
    font-size: 18px;
    font-weight: 600;
    padding: 12px 0;
    outline: none;
    -moz-appearance: textfield;
}

.dlg-input::-webkit-outer-spin-button,
.dlg-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.dlg-all-btn {
    text-align: right;
    font-size: 12px;
    color: rgba(67, 243, 255, 0.55);
    cursor: pointer;
    transition: color 0.2s;
}

.dlg-all-btn:hover {
    color: #43f3ff;
}

.dlg-footer {
    display: flex;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.dlg-cancel {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.dlg-cancel:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
}

.dlg-confirm {
    flex: 2;
    padding: 10px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.dlg-confirm:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.topup-btn {
    background: linear-gradient(135deg, rgba(120, 140, 255, 0.8), rgba(80, 120, 255, 0.9));
    color: #fff;
    box-shadow: 0 4px 14px rgba(100, 120, 255, 0.3);
}

.topup-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(100, 120, 255, 0.4);
}

.withdraw-btn {
    background: linear-gradient(135deg, rgba(255, 140, 100, 0.8), rgba(220, 100, 70, 0.9));
    color: #fff;
    box-shadow: 0 4px 14px rgba(255, 120, 80, 0.3);
}

.withdraw-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255, 120, 80, 0.4);
}
</style>
