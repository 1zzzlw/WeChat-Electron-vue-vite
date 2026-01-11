export interface Friend {
    userId: number;
    friendId: number;
    username: string;
    avatar: string;
    remark?: string;
    relationStatus: number;
}