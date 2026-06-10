<template>
    <div class="wallet-container">
        <div class="wallet-content">
            <!-- 顶部标题 -->
            <div class="wallet-header">
                <h2 class="wallet-title">我的钱包</h2>
                <span class="wallet-subtitle">Wallet</span>
            </div>

            <!-- 余额卡片 -->
            <div class="balance-card">
                <div class="balance-card-inner">
                    <div class="balance-label">
                        <span>可用余额</span>
                        <el-icon class="balance-eye" @click="toggleBalanceVisibility">
                            <View v-if="showBalance" />
                            <Hide v-else />
                        </el-icon>
                    </div>
                    <div class="balance-amount">
                        <span class="balance-currency">¥</span>
                        <span class="balance-value">{{ showBalance ? '6,280.50' : '******' }}</span>
                    </div>
                    <div class="balance-meta">
                        <div class="balance-meta-item">
                            <span class="meta-label">冻结金额</span>
                            <span class="meta-value">¥0.00</span>
                        </div>
                        <div class="balance-meta-item">
                            <span class="meta-label">累计收入</span>
                            <span class="meta-value meta-income">¥12,450.00</span>
                        </div>
                    </div>
                    <div class="balance-card-decoration"></div>
                </div>
            </div>

            <!-- 快捷操作 -->
            <div class="quick-actions">
                <div class="action-item" @click="handleSend">
                    <div class="action-icon action-send">
                        <el-icon size="22"><Upload /></el-icon>
                    </div>
                    <span class="action-label">转账</span>
                </div>
                <div class="action-item" @click="handleReceive">
                    <div class="action-icon action-receive">
                        <el-icon size="22"><Download /></el-icon>
                    </div>
                    <span class="action-label">收款</span>
                </div>
                <div class="action-item" @click="handleScan">
                    <div class="action-icon action-scan">
                        <el-icon size="22"><Picture /></el-icon>
                    </div>
                    <span class="action-label">扫码</span>
                </div>
                <div class="action-item" @click="handleTopUp">
                    <div class="action-icon action-topup">
                        <el-icon size="22"><Plus /></el-icon>
                    </div>
                    <span class="action-label">充值</span>
                </div>
                <div class="action-item" @click="handleWithdraw">
                    <div class="action-icon action-withdraw">
                        <el-icon size="22"><CreditCard /></el-icon>
                    </div>
                    <span class="action-label">提现</span>
                </div>
            </div>

            <!-- 支付方式 -->
            <div class="section">
                <div class="section-header">
                    <span class="section-title">支付方式</span>
                    <span class="section-more" @click="handleManagePayment">管理</span>
                </div>
                <div class="payment-list">
                    <div class="payment-item" v-for="method in paymentMethods" :key="method.id">
                        <div class="payment-icon" :class="method.type">
                            <el-icon size="20">
                                <CreditCard />
                            </el-icon>
                        </div>
                        <div class="payment-info">
                            <span class="payment-name">{{ method.name }}</span>
                            <span class="payment-detail">{{ method.detail }}</span>
                        </div>
                        <el-icon class="payment-check" v-if="method.isDefault" size="18">
                            <Check />
                        </el-icon>
                    </div>
                </div>
            </div>

            <!-- 交易记录 -->
            <div class="section">
                <div class="section-header">
                    <span class="section-title">交易记录</span>
                    <span class="section-more" @click="handleViewAllTransactions">全部</span>
                </div>
                <div class="transaction-list" v-if="transactions.length > 0">
                    <div class="transaction-item" v-for="tx in transactions" :key="tx.id">
                        <div class="tx-icon" :class="tx.type">
                            <el-icon size="18">
                                <Download v-if="tx.type === 'income'" />
                                <Upload v-else-if="tx.type === 'expense'" />
                                <Refresh v-else />
                            </el-icon>
                        </div>
                        <div class="tx-info">
                            <span class="tx-name">{{ tx.name }}</span>
                            <span class="tx-time">{{ tx.time }}</span>
                        </div>
                        <div class="tx-amount" :class="tx.type">
                            <span>{{ tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '' }}¥{{ tx.amount }}</span>
                        </div>
                    </div>
                </div>
                <div v-else class="empty-state">
                    <el-icon class="empty-icon"><Document /></el-icon>
                    <span class="empty-text">暂无交易记录</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { View, Hide, Upload, Download, Picture, Plus, CreditCard, Check, Refresh, Document } from '@element-plus/icons-vue'

// 余额可见性
const showBalance = ref(true)

// 支付方式数据
const paymentMethods = ref([
    { id: 1, type: 'card', name: '中国银行储蓄卡', detail: '**** **** **** 3829', isDefault: true },
    { id: 2, type: 'alipay', name: '支付宝', detail: 'user@example.com', isDefault: false },
    { id: 3, type: 'wechat', name: '微信支付', detail: '已绑定', isDefault: false }
])

// 交易记录数据
const transactions = ref([
    { id: 1, type: 'income', name: '转账收入', time: '2026-06-10 14:32', amount: '500.00' },
    { id: 2, type: 'expense', name: '转账支出', time: '2026-06-10 10:15', amount: '200.00' },
    { id: 3, type: 'income', name: '红包收入', time: '2026-06-09 18:45', amount: '88.88' },
    { id: 4, type: 'expense', name: '群收款', time: '2026-06-09 09:20', amount: '56.00' },
    { id: 5, type: 'income', name: '转账收入', time: '2026-06-08 16:10', amount: '1,200.00' }
])

// 空方法占位
const toggleBalanceVisibility = () => {
    showBalance.value = !showBalance.value
}
const handleSend = () => {}
const handleReceive = () => {}
const handleScan = () => {}
const handleTopUp = () => {}
const handleWithdraw = () => {}
const handleManagePayment = () => {}
const handleViewAllTransactions = () => {}
</script>

<style scoped>
.wallet-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    overflow: hidden;
}

.wallet-content {
    width: 520px;
    height: 100%;
    padding: 30px 20px;
    box-sizing: border-box;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

/* 顶部标题 */
.wallet-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 0 4px;
}

.wallet-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #43f3ff;
    text-shadow: 0 0 12px rgba(67, 243, 255, 0.4);
    letter-spacing: 1px;
}

.wallet-subtitle {
    font-size: 13px;
    color: rgba(67, 243, 255, 0.4);
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
}

/* 余额卡片 */
.balance-card {
    position: relative;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(67, 243, 255, 0.15) 0%, rgba(0, 140, 255, 0.1) 50%, rgba(120, 80, 255, 0.12) 100%);
    border: 1px solid rgba(67, 243, 255, 0.25);
    box-shadow: 0 0 30px rgba(67, 243, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.03);
    overflow: hidden;
}

.balance-card-inner {
    padding: 28px 24px 24px;
    position: relative;
    z-index: 1;
}

.balance-card-decoration {
    position: absolute;
    top: -40px;
    right: -20px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(67, 243, 255, 0.08) 0%, transparent 70%);
    pointer-events: none;
}

.balance-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 10px;
}

.balance-eye {
    cursor: pointer;
    color: rgba(67, 243, 255, 0.5);
    transition: color 0.2s ease;
}

.balance-eye:hover {
    color: #43f3ff;
}

.balance-amount {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin-bottom: 20px;
}

.balance-currency {
    font-size: 20px;
    font-weight: 500;
    color: #43f3ff;
    opacity: 0.8;
}

.balance-value {
    font-size: 40px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 20px rgba(67, 243, 255, 0.4);
    letter-spacing: 1px;
    font-variant-numeric: tabular-nums;
}

.balance-meta {
    display: flex;
    gap: 32px;
}

.balance-meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.meta-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
}

.meta-value {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
}

.meta-income {
    color: rgba(67, 243, 255, 0.8);
}

/* 快捷操作 */
.quick-actions {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.action-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.action-send {
    background: rgba(67, 243, 255, 0.12);
    border: 1px solid rgba(67, 243, 255, 0.25);
    color: #43f3ff;
}

.action-receive {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.25);
    color: #00ff88;
}

.action-scan {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.25);
    color: #ffd700;
}

.action-topup {
    background: rgba(120, 140, 255, 0.1);
    border: 1px solid rgba(120, 140, 255, 0.25);
    color: #788cff;
}

.action-withdraw {
    background: rgba(255, 140, 100, 0.1);
    border: 1px solid rgba(255, 140, 100, 0.25);
    color: #ff8c64;
}

.action-item:hover .action-icon {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.action-item:hover .action-send {
    box-shadow: 0 6px 24px rgba(67, 243, 255, 0.3);
    border-color: rgba(67, 243, 255, 0.5);
}

.action-item:hover .action-receive {
    box-shadow: 0 6px 24px rgba(0, 255, 136, 0.25);
    border-color: rgba(0, 255, 136, 0.5);
}

.action-item:hover .action-scan {
    box-shadow: 0 6px 24px rgba(255, 215, 0, 0.25);
    border-color: rgba(255, 215, 0, 0.5);
}

.action-item:hover .action-topup {
    box-shadow: 0 6px 24px rgba(120, 140, 255, 0.25);
    border-color: rgba(120, 140, 255, 0.5);
}

.action-item:hover .action-withdraw {
    box-shadow: 0 6px 24px rgba(255, 140, 100, 0.25);
    border-color: rgba(255, 140, 100, 0.5);
}

.action-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.3s;
}

.action-item:hover .action-label {
    color: rgba(255, 255, 255, 0.9);
}

/* 通用 section */
.section {
    background: rgba(67, 243, 255, 0.04);
    border: 1px solid rgba(67, 243, 255, 0.12);
    border-radius: 14px;
    padding: 18px 16px;
    transition: border-color 0.3s ease;
}

.section:hover {
    border-color: rgba(67, 243, 255, 0.2);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
}

.section-more {
    font-size: 12px;
    color: rgba(67, 243, 255, 0.55);
    cursor: pointer;
    transition: color 0.2s ease;
}

.section-more:hover {
    color: #43f3ff;
}

/* 支付方式 */
.payment-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.payment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.payment-item:hover {
    background: rgba(67, 243, 255, 0.06);
}

.payment-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.payment-icon.card {
    background: rgba(255, 180, 80, 0.15);
    color: #ffb450;
}

.payment-icon.alipay {
    background: rgba(0, 160, 255, 0.15);
    color: #00a0ff;
}

.payment-icon.wechat {
    background: rgba(0, 200, 80, 0.15);
    color: #00c850;
}

.payment-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.payment-name {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
}

.payment-detail {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
}

.payment-check {
    color: rgba(67, 243, 255, 0.7);
}

/* 交易记录 */
.transaction-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.transaction-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
}

.transaction-item:hover {
    background: rgba(67, 243, 255, 0.05);
}

.tx-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.tx-icon.income {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
}

.tx-icon.expense {
    background: rgba(255, 140, 100, 0.1);
    color: #ff8c64;
}

.tx-icon.refund {
    background: rgba(255, 215, 0, 0.1);
    color: #ffd700;
}

.tx-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tx-name {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 500;
}

.tx-time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
}

.tx-amount {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.tx-amount.income {
    color: #00ff88;
}

.tx-amount.expense {
    color: rgba(255, 255, 255, 0.8);
}

.tx-amount.refund {
    color: #ffd700;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 30px 0;
}

.empty-icon {
    font-size: 32px;
    color: rgba(67, 243, 255, 0.25);
}

.empty-text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.35);
}

/* 滚动条 */
.wallet-content::-webkit-scrollbar {
    width: 4px;
}

.wallet-content::-webkit-scrollbar-track {
    background: transparent;
}

.wallet-content::-webkit-scrollbar-thumb {
    background: rgba(67, 243, 255, 0.2);
    border-radius: 2px;
}

.wallet-content::-webkit-scrollbar-thumb:hover {
    background: rgba(67, 243, 255, 0.35);
}
</style>
