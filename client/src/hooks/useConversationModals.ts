import { useState, useCallback } from 'react';
import { type Participant } from '../types';

export type ModalType = 
  | 'groupName'
  | 'leaveGroup'
  | 'addPeople'
  | 'promoteUser'
  | 'removeUser'
  | 'blockUser'
  | 'unblockUser'
  | 'inviteUnregistered';

interface ModalState {
  [key: string]: {
    isOpen: boolean;
    data?: any;
  };
}

interface ConversationModalsHook {
  // Modal states
  isModalOpen: (modalType: ModalType) => boolean;
  getModalData: <T = any>(modalType: ModalType) => T | undefined;
  
  // Modal actions
  openModal: (modalType: ModalType, data?: any) => void;
  closeModal: (modalType: ModalType) => void;
  closeAllModals: () => void;
  
  // Specific modal state getters
  isGroupNameModalOpen: boolean;
  isLeaveGroupModalOpen: boolean;
  isAddPeopleModalOpen: boolean;
  isPromoteUserModalOpen: boolean;
  isRemoveUserModalOpen: boolean;
  isBlockUserModalOpen: boolean;
  isUnblockUserModalOpen: boolean;
  isInviteUnregisteredModalOpen: boolean;
  
  // Specific data getters
  userToPromote: Participant | null;
  userToRemove: Participant | null;
  userToBlock: Participant | null;
  userToUnblock: Participant | null;
  
  // Specific modal handlers
  openGroupNameModal: () => void;
  closeGroupNameModal: () => void;
  openLeaveGroupModal: () => void;
  closeLeaveGroupModal: () => void;
  openAddPeopleModal: () => void;
  closeAddPeopleModal: () => void;
  openPromoteUserModal: (participant: Participant) => void;
  closePromoteUserModal: () => void;
  openRemoveUserModal: (participant: Participant) => void;
  closeRemoveUserModal: () => void;
  openBlockUserModal: (participant: Participant) => void;
  closeBlockUserModal: () => void;
  openUnblockUserModal: (participant: Participant) => void;
  closeUnblockUserModal: () => void;
  openInviteUnregisteredModal: () => void;
  closeInviteUnregisteredModal: () => void;
}

const initialModalState: ModalState = {
  groupName: { isOpen: false },
  leaveGroup: { isOpen: false },
  addPeople: { isOpen: false },
  promoteUser: { isOpen: false },
  removeUser: { isOpen: false },
  blockUser: { isOpen: false },
  unblockUser: { isOpen: false },
  inviteUnregistered: { isOpen: false },
};

export function useConversationModals(): ConversationModalsHook {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  // Generic modal actions
  const openModal = useCallback((modalType: ModalType, data?: any) => {
    setModalState(prev => ({
      ...prev,
      [modalType]: { isOpen: true, data }
    }));
  }, []);

  const closeModal = useCallback((modalType: ModalType) => {
    setModalState(prev => ({
      ...prev,
      [modalType]: { isOpen: false, data: undefined }
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalState(initialModalState);
  }, []);

  const isModalOpen = useCallback((modalType: ModalType) => {
    return modalState[modalType]?.isOpen ?? false;
  }, [modalState]);

  const getModalData = useCallback(<T = any>(modalType: ModalType): T | undefined => {
    return modalState[modalType]?.data as T;
  }, [modalState]);

  // Specific modal handlers
  const openGroupNameModal = useCallback(() => openModal('groupName'), [openModal]);
  const closeGroupNameModal = useCallback(() => closeModal('groupName'), [closeModal]);
  
  const openLeaveGroupModal = useCallback(() => openModal('leaveGroup'), [openModal]);
  const closeLeaveGroupModal = useCallback(() => closeModal('leaveGroup'), [closeModal]);
  
  const openAddPeopleModal = useCallback(() => openModal('addPeople'), [openModal]);
  const closeAddPeopleModal = useCallback(() => closeModal('addPeople'), [closeModal]);
  
  const openPromoteUserModal = useCallback((participant: Participant) => {
    openModal('promoteUser', participant);
  }, [openModal]);
  const closePromoteUserModal = useCallback(() => closeModal('promoteUser'), [closeModal]);
  
  const openRemoveUserModal = useCallback((participant: Participant) => {
    openModal('removeUser', participant);
  }, [openModal]);
  const closeRemoveUserModal = useCallback(() => closeModal('removeUser'), [closeModal]);
  
  const openBlockUserModal = useCallback((participant: Participant) => {
    openModal('blockUser', participant);
  }, [openModal]);
  const closeBlockUserModal = useCallback(() => closeModal('blockUser'), [closeModal]);
  
  const openUnblockUserModal = useCallback((participant: Participant) => {
    openModal('unblockUser', participant);
  }, [openModal]);
  const closeUnblockUserModal = useCallback(() => closeModal('unblockUser'), [closeModal]);
  
  const openInviteUnregisteredModal = useCallback(() => openModal('inviteUnregistered'), [openModal]);
  const closeInviteUnregisteredModal = useCallback(() => closeModal('inviteUnregistered'), [closeModal]);

  return {
    // Generic actions
    isModalOpen,
    getModalData,
    openModal,
    closeModal,
    closeAllModals,
    
    // Specific modal state getters
    isGroupNameModalOpen: isModalOpen('groupName'),
    isLeaveGroupModalOpen: isModalOpen('leaveGroup'),
    isAddPeopleModalOpen: isModalOpen('addPeople'),
    isPromoteUserModalOpen: isModalOpen('promoteUser'),
    isRemoveUserModalOpen: isModalOpen('removeUser'),
    isBlockUserModalOpen: isModalOpen('blockUser'),
    isUnblockUserModalOpen: isModalOpen('unblockUser'),
    isInviteUnregisteredModalOpen: isModalOpen('inviteUnregistered'),
    
    // Specific data getters
    userToPromote: getModalData<Participant>('promoteUser') ?? null,
    userToRemove: getModalData<Participant>('removeUser') ?? null,
    userToBlock: getModalData<Participant>('blockUser') ?? null,
    userToUnblock: getModalData<Participant>('unblockUser') ?? null,
    
    // Specific handlers
    openGroupNameModal,
    closeGroupNameModal,
    openLeaveGroupModal,
    closeLeaveGroupModal,
    openAddPeopleModal,
    closeAddPeopleModal,
    openPromoteUserModal,
    closePromoteUserModal,
    openRemoveUserModal,
    closeRemoveUserModal,
    openBlockUserModal,
    closeBlockUserModal,
    openUnblockUserModal,
    closeUnblockUserModal,
    openInviteUnregisteredModal,
    closeInviteUnregisteredModal,
  };
}