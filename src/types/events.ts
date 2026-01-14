export type EventRecord = {
  id: number
  startDate: string       // 开始日期（YYYY-MM-DD）
  startTime: string       // 开始时间（HH:mm）
  endDate: string         // 结束日期（YYYY-MM-DD）
  endTime: string         // 结束时间（HH:mm）
  durationMinutes: number // 持续时间（分钟）
  note: string           // 备注
  createdAt: string      // 记录创建时间（ISO 8601）
  // 向后兼容字段
  date?: string          // 保留用于向后兼容
}

export type EventItem = {
  _id?: string           // 云开发文档 ID
  _openid?: string       // 云开发用户标识（自动添加）
  id: number             // 业务 ID
  title: string          // 事件标题
  description: string    // 事件描述
  createdAt: string      // 创建时间（ISO 8601）
  updatedAt?: string     // 更新时间（ISO 8601）- 可选以兼容旧数据
  records: EventRecord[] // 记录数组
}
