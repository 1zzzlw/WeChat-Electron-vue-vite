<template>
  <div class="setting-store-location">
    <div class="location-item">
      <div class="location-label">存储位置</div>
      <div class="location-value">
        <span class="path-text">{{ location || '未设置' }}</span>
        <a href="javascript:;" class="choose-link" @click="choose">
          <el-icon>
            <FolderAdd />
          </el-icon>
          <span>选择存储位置</span>
        </a>
      </div>
    </div>

    <div class="location-tip">
      <el-icon class="tip-icon">
        <InfoFilled />
      </el-icon>
      <span>建议设置除C盘外的路径存储文件</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FolderAdd, InfoFilled } from '@element-plus/icons-vue'

const location = ref('')

const choose = () => {
  console.info('选择存储位置');
  (window as any).uploadFileApi.selectFile('storeLocation').then((filePath: any) => {
    if (filePath) {
      location.value = filePath.localPath
      console.info('选择的存储位置:', filePath.localPath);
      (window as any).userInfoApi.storeSetUserInfo('storeLocation', filePath.localPath)
      console.info('存储位置已保存')
    }
  })
}

onMounted(async () => {
  location.value = (await (window as any).userInfoApi.storeGetUserInfo('storeLocation')) || ''
})
</script>

<style scoped>
.setting-store-location {
  width: 100%;
  padding: 20px 25px;
  -webkit-app-region: no-drag;
}

.location-item {
  margin-bottom: 15px;
}

.location-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  font-weight: 500;
}

.location-value {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.path-text {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-text:empty::before {
  content: '未设置';
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
}

.choose-link {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: rgba(102, 126, 234, 0.9);
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.25s ease;
  flex-shrink: 0;
  cursor: pointer;
}

.choose-link:hover {
  color: rgba(102, 126, 234, 1);
  background: rgba(102, 126, 234, 0.12);
}

.choose-link:active {
  transform: scale(0.98);
}

.location-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 8px;
  border-left: 3px solid rgba(102, 126, 234, 0.8);
}

.tip-icon {
  color: rgba(102, 126, 234, 1);
  font-size: 15px;
  margin-top: 1px;
  flex-shrink: 0;
}

.location-tip span {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.5;
}
</style>